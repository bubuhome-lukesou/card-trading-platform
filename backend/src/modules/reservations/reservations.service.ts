import { Injectable, NotFoundException, BadRequestException, ForbiddenException, forwardRef, Inject } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, LessThanOrEqual, Not, In, DataSource } from 'typeorm'
import { Cron } from '@nestjs/schedule'
import { Reservation, ReservationStatus } from '../../entities/reservation.entity'
import { Product, ListingType } from '../../entities/product.entity'
import { Order, OrderType, OrderStatus } from '../../entities/order.entity'
import { OrdersService } from '../orders/orders.service'

@Injectable()
export class ReservationsService {
  constructor(
    @InjectRepository(Reservation)
    private reservationRepo: Repository<Reservation>,
    @InjectRepository(Product)
    private productRepo: Repository<Product>,
    @InjectRepository(Order)
    private orderRepo: Repository<Order>,
    @Inject(forwardRef(() => OrdersService))
    private ordersService: OrdersService,
    private dataSource: DataSource,
  ) {}

  async create(productId: string, buyerId: string, depositAmount: number, expireTime: Date, quantity: number = 1): Promise<{ reservation: Reservation; order: Order }> {
    // R3: Use transaction with pessimistic lock to prevent concurrent oversell
    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()

    try {
      // Check product exists and is reservation type
      const product = await queryRunner.manager.findOne(Product, { where: { id: productId } })
      if (!product) {
        throw new NotFoundException('Product not found')
      }
      if (product.listingType !== ListingType.RESERVATION) {
        throw new BadRequestException('Product is not available for reservation')
      }

      // Validate quantity
      if (quantity < 1) {
        throw new BadRequestException('Quantity must be at least 1')
      }

      // R15: reservationMax fallback — use product.quantity, not 999
      const maxQty = product.reservationMax || product.quantity || 0
      if (maxQty <= 0) {
        throw new BadRequestException('This product has no available reservation spots')
      }

      // Check per-user reservation limit (include CONFIRMED to prevent overbooking)
      if (product.reservationLimitPerUser) {
        const userExisting = await queryRunner.manager
          .createQueryBuilder(Reservation, 'r')
          .setLock('pessimistic_write')
          .where('r.productId = :productId', { productId })
          .andWhere('r.buyerId = :buyerId', { buyerId })
          .andWhere('r.status IN (:...statuses)', { statuses: [ReservationStatus.PENDING, ReservationStatus.DEPOSIT_PAID, ReservationStatus.CONFIRMED] })
          .getOne()
        const userReservedQty = userExisting ? (userExisting.quantity || 1) : 0
        if (userReservedQty + quantity > product.reservationLimitPerUser) {
          throw new BadRequestException(`You can only reserve up to ${product.reservationLimitPerUser} per user`)
        }
      }

      // R3: Check total reservation limit with pessimistic lock
      const totalReserved = await queryRunner.manager
        .createQueryBuilder(Reservation, 'r')
        .setLock('pessimistic_write')
        .where('r.productId = :productId', { productId })
        .andWhere('r.status IN (:...statuses)', { statuses: [ReservationStatus.PENDING, ReservationStatus.DEPOSIT_PAID, ReservationStatus.CONFIRMED] })
        .select('COALESCE(SUM(r.quantity), 0)', 'total')
        .getRawOne()
      const currentTotal = parseInt(totalReserved?.total || '0', 10)

      if (currentTotal + quantity > maxQty) {
        throw new BadRequestException(`Only ${maxQty - currentTotal} spots remaining`)
      }

      // Check if buyer already has a pending/deposit_paid reservation
      const existing = await queryRunner.manager.findOne(Reservation, {
        where: { productId, buyerId, status: ReservationStatus.DEPOSIT_PAID }
      })
      if (existing) {
        throw new BadRequestException('You have already made a deposit-paid reservation for this product')
      }

      // Also check PENDING reservation (update quantity instead of creating new)
      const existingPending = await queryRunner.manager.findOne(Reservation, {
        where: { productId, buyerId, status: ReservationStatus.PENDING }
      })
      if (existingPending) {
        if (product.reservationLimitPerUser && quantity > product.reservationLimitPerUser) {
          throw new BadRequestException(`You can only reserve up to ${product.reservationLimitPerUser} per user`)
        }

        const totalExcludingThis = currentTotal - (existingPending.quantity || 1)
        if (totalExcludingThis + quantity > maxQty) {
          throw new BadRequestException(`Only ${maxQty - totalExcludingThis} spots remaining`)
        }

        if (quantity < 1) {
          throw new BadRequestException('Quantity must be at least 1')
        }

        existingPending.quantity = quantity
        existingPending.depositAmount = depositAmount
        const updatedReservation = await queryRunner.manager.save(existingPending)

        // Update the existing deposit order's total price
        const existingOrder = await queryRunner.manager.findOne(Order, {
          where: { reservationId: updatedReservation.id, type: OrderType.RESERVATION_DEPOSIT }
        })
        if (existingOrder) {
          existingOrder.totalPrice = depositAmount * quantity
          existingOrder.quantity = quantity
          existingOrder.notes = `預約訂金 - 預約ID: ${updatedReservation.id} x ${quantity}`
          await queryRunner.manager.save(existingOrder)
          await queryRunner.commitTransaction()
          return { reservation: updatedReservation, order: existingOrder }
        }

        // Fallback: create new order if not found
        const orderData = {
          buyerId,
          sellerId: product.sellerId,
          productId,
          type: OrderType.RESERVATION_DEPOSIT,
          status: OrderStatus.PENDING,
          totalPrice: depositAmount * quantity,
          quantity,
          notes: `預約訂金 - 預約ID: ${updatedReservation.id} x ${quantity}`,
          reservationId: updatedReservation.id,
        }
        const order = queryRunner.manager.create(Order, {
          orderNumber: 'ORD-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase(),
          shippingCost: 0,
          platformFee: 0,
          ...orderData,
        })
        const savedOrder = await queryRunner.manager.save(order)
        await queryRunner.commitTransaction()
        return { reservation: updatedReservation, order: savedOrder }
      }

      // Create reservation record
      const reservation = queryRunner.manager.create(Reservation, {
        productId,
        buyerId,
        quantity,
        depositAmount,
        expireTime,
        status: ReservationStatus.PENDING,
      })
      const savedReservation = await queryRunner.manager.save(reservation)

      // Also create an order record for unified tracking
      const order = queryRunner.manager.create(Order, {
        orderNumber: 'ORD-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase(),
        buyerId,
        sellerId: product.sellerId,
        productId,
        type: OrderType.RESERVATION_DEPOSIT,
        status: OrderStatus.PENDING,
        totalPrice: depositAmount * quantity,
        quantity,
        shippingCost: 0,
        platformFee: 0,
        notes: `預約訂金 - 預約ID: ${savedReservation.id} x ${quantity}`,
        reservationId: savedReservation.id,
      })
      const savedOrder = await queryRunner.manager.save(order)

      await queryRunner.commitTransaction()
      return { reservation: savedReservation, order: savedOrder }
    } catch (err) {
      await queryRunner.rollbackTransaction()
      throw err
    } finally {
      await queryRunner.release()
    }
  }

  async confirmDeposit(reservationId: string, userId: string): Promise<Reservation> {
    // R10: Use transaction to prevent concurrent duplicate balance order creation
    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()

    try {
      const reservation = await queryRunner.manager.findOne(Reservation, {
        where: { id: reservationId },
        relations: ['product', 'buyer']
      })
      if (!reservation) {
        throw new NotFoundException('Reservation not found')
      }

      // Only the seller of the product can confirm deposit
      const product = await queryRunner.manager.findOne(Product, { where: { id: reservation.productId } })
      if (!product) {
        throw new NotFoundException('Product not found')
      }
      if (product.sellerId !== userId) {
        throw new ForbiddenException('Only the seller can confirm deposits')
      }

      if (reservation.status !== ReservationStatus.PENDING) {
        throw new BadRequestException('Reservation must be in pending status to confirm deposit')
      }

      // R4: Verify the deposit order has been paid (PENDING_PAID or CONFIRMED)
      const depositOrder = await queryRunner.manager.findOne(Order, {
        where: { reservationId: reservation.id, type: OrderType.RESERVATION_DEPOSIT }
      })
      if (!depositOrder) {
        throw new BadRequestException('No deposit order found for this reservation')
      }
      if (depositOrder.status === OrderStatus.PENDING) {
        throw new BadRequestException('Buyer has not uploaded payment proof yet. Cannot confirm deposit.')
      }
      if (depositOrder.status === OrderStatus.CANCELLED) {
        throw new BadRequestException('Deposit order has been cancelled. Cannot confirm.')
      }

      reservation.status = ReservationStatus.DEPOSIT_PAID
      reservation.depositPaidAt = new Date()
      const saved = await queryRunner.manager.save(reservation)

      // R4: Create a RESERVATION_FULL (balance) order linked to this reservation
      const balanceAmount = Number(product.price) - Number(reservation.depositAmount)
      if (balanceAmount > 0) {
        const existingBalance = await queryRunner.manager.findOne(Order, {
          where: { reservationId: reservation.id, type: OrderType.RESERVATION_FULL }
        })
        if (!existingBalance) {
          const balanceOrder = queryRunner.manager.create(Order, {
            orderNumber: 'ORD-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase(),
            buyerId: reservation.buyerId,
            sellerId: product.sellerId,
            productId: reservation.productId,
            type: OrderType.RESERVATION_FULL,
            status: OrderStatus.PENDING,
            totalPrice: balanceAmount * (reservation.quantity || 1),
            quantity: reservation.quantity || 1,
            shippingCost: 0,
            platformFee: 0,
            notes: `預約尾款 - 預約ID: ${reservation.id} (尾款 = ${product.price} - ${reservation.depositAmount} = ${balanceAmount})`,
            reservationId: reservation.id,
          })
          await queryRunner.manager.save(balanceOrder)
        }
      }

      await queryRunner.commitTransaction()
      return saved
    } catch (err) {
      await queryRunner.rollbackTransaction()
      throw err
    } finally {
      await queryRunner.release()
    }
  }

  // R5: Seller confirms a deposit-paid reservation → CONFIRMED
  async confirmReservation(reservationId: string, userId: string): Promise<Reservation> {
    const reservation = await this.findOne(reservationId)
    
    const product = await this.productRepo.findOne({ where: { id: reservation.productId } })
    if (!product) {
      throw new NotFoundException('Product not found')
    }
    if (product.sellerId !== userId) {
      throw new ForbiddenException('Only the seller can confirm reservations')
    }

    if (reservation.status !== ReservationStatus.DEPOSIT_PAID) {
      throw new BadRequestException('Reservation must be in deposit_paid status to confirm')
    }

    // R5: Verify the balance (tail payment) order has been paid
    const balanceOrder = await this.orderRepo.findOne({
      where: { reservationId: reservation.id, type: OrderType.RESERVATION_FULL }
    })
    if (balanceOrder) {
      if (balanceOrder.status === OrderStatus.PENDING) {
        throw new BadRequestException('Buyer has not paid the balance yet. Cannot confirm reservation.')
      }
      if (balanceOrder.status === OrderStatus.CANCELLED) {
        throw new BadRequestException('Balance order has been cancelled. Cannot confirm.')
      }
    }
    // If no balance order exists (e.g. deposit = full price), allow confirmation

    reservation.status = ReservationStatus.CONFIRMED
    return this.reservationRepo.save(reservation)
  }

  async findByProduct(productId: string) {
    return this.reservationRepo.find({
      where: { productId },
      relations: ['buyer'],
      order: { createdAt: 'ASC' }
    })
  }

  async findByBuyer(buyerId: string) {
    return this.reservationRepo.find({
      where: { buyerId },
      relations: ['product'],
      order: { createdAt: 'DESC' }
    })
  }

  async findBySeller(sellerId: string) {
    return this.reservationRepo
      .createQueryBuilder('r')
      .innerJoin('r.product', 'p')
      .where('p.sellerId = :sellerId', { sellerId })
      .leftJoinAndSelect('r.buyer', 'buyer')
      .leftJoinAndSelect('r.product', 'product')
      .orderBy('r.createdAt', 'DESC')
      .getMany()
  }

  async findOne(id: string) {
    const reservation = await this.reservationRepo.findOne({
      where: { id },
      relations: ['product', 'buyer']
    })
    if (!reservation) {
      throw new NotFoundException('Reservation not found')
    }
    return reservation
  }

  async cancel(id: string, userId: string): Promise<Reservation> {
    const reservation = await this.findOne(id)
    
    // Check ownership
    const product = await this.productRepo.findOne({ where: { id: reservation.productId } })
    if (reservation.buyerId !== userId && product?.sellerId !== userId) {
      throw new ForbiddenException('You do not have permission to cancel this reservation')
    }

    // R8: Only allow cancellation from PENDING or DEPOSIT_PAID states
    if (reservation.status === ReservationStatus.CONFIRMED || reservation.status === ReservationStatus.CANCELLED || reservation.status === ReservationStatus.EXPIRED) {
      throw new BadRequestException(`Cannot cancel reservation with status: ${reservation.status}`)
    }

    reservation.status = ReservationStatus.CANCELLED
    const saved = await this.reservationRepo.save(reservation)

    // R8: Cancel associated orders (deposit and balance)
    const orders = await this.orderRepo.find({
      where: [
        { reservationId: id, type: OrderType.RESERVATION_DEPOSIT },
        { reservationId: id, type: OrderType.RESERVATION_FULL },
      ]
    })
    for (const order of orders) {
      if (order.status === OrderStatus.PENDING || order.status === OrderStatus.PENDING_PAID) {
        order.status = OrderStatus.CANCELLED
        await this.orderRepo.save(order)
      }
    }

    return saved
  }

  async getReservationCount(productId: string): Promise<number> {
    // R2: Use SUM(quantity) not COUNT to correctly calculate reserved spots
    const result = await this.reservationRepo
      .createQueryBuilder('r')
      .where('r.productId = :productId', { productId })
      .andWhere('r.status IN (:...statuses)', {
        statuses: [ReservationStatus.PENDING, ReservationStatus.DEPOSIT_PAID, ReservationStatus.CONFIRMED]
      })
      .select('COALESCE(SUM(r.quantity), 0)', 'total')
      .getRawOne()
    return parseInt(result?.total || '0', 10)
  }

  async getProduct(productId: string): Promise<Product> {
    const product = await this.productRepo.findOne({ where: { id: productId } })
    if (!product) {
      throw new NotFoundException('Product not found')
    }
    return product
  }

  // R6+R12: Cron job to expire overdue reservations every minute
  // R6: Expire PENDING reservations past deadline
  // R12: Expire DEPOSIT_PAID reservations where balance order is still PENDING after 30 days
  @Cron('* * * * *')
  async expireOverdueReservations() {
    const now = new Date()

    // R6: Expire PENDING reservations past expireTime
    const overdue = await this.reservationRepo.find({
      where: {
        status: ReservationStatus.PENDING,
        expireTime: LessThanOrEqual(now),
      }
    })

    for (const reservation of overdue) {
      try {
        reservation.status = ReservationStatus.EXPIRED
        await this.reservationRepo.save(reservation)
        // Also cancel the associated deposit order
        const depositOrder = await this.orderRepo.findOne({
          where: { reservationId: reservation.id, type: OrderType.RESERVATION_DEPOSIT }
        })
        if (depositOrder && depositOrder.status === OrderStatus.PENDING) {
          depositOrder.status = OrderStatus.CANCELLED
          await this.orderRepo.save(depositOrder)
        }
      } catch (err) {
        console.error(`[Cron] Failed to expire reservation ${reservation.id}:`, err)
      }
    }

    if (overdue.length > 0) {
      console.log(`[Cron] Expired ${overdue.length} overdue reservations`)
    }

    // R12: Expire DEPOSIT_PAID reservations where balance order PENDING for >30 days
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const staleDepositPaid = await this.reservationRepo
      .createQueryBuilder('r')
      .where('r.status = :status', { status: ReservationStatus.DEPOSIT_PAID })
      .andWhere('r.depositPaidAt <= :cutoff', { cutoff: thirtyDaysAgo })
      .getMany()

    for (const reservation of staleDepositPaid) {
      try {
        // Check if balance order is still PENDING (not paid)
        const balanceOrder = await this.orderRepo.findOne({
          where: { reservationId: reservation.id, type: OrderType.RESERVATION_FULL }
        })
        if (balanceOrder && balanceOrder.status === OrderStatus.PENDING) {
          reservation.status = ReservationStatus.EXPIRED
          await this.reservationRepo.save(reservation)
          balanceOrder.status = OrderStatus.CANCELLED
          await this.orderRepo.save(balanceOrder)
          console.log(`[Cron] Expired stale DEPOSIT_PAID reservation ${reservation.id} (no balance payment for 30+ days)`)
        }
      } catch (err) {
        console.error(`[Cron] Failed to expire stale deposit_paid reservation ${reservation.id}:`, err)
      }
    }
  }
}