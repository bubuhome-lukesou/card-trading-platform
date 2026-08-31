import { Injectable, NotFoundException, BadRequestException, ForbiddenException, forwardRef, Inject } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, LessThanOrEqual, Not, In } from 'typeorm'
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
  ) {}

  async create(productId: string, buyerId: string, depositAmount: number, expireTime: Date, quantity: number = 1): Promise<{ reservation: Reservation; order: Order }> {
    // Check product exists and is reservation type
    const product = await this.productRepo.findOne({ where: { id: productId } })
    if (!product) {
      throw new NotFoundException('Product not found')
    }
    if (product.listingType !== ListingType.RESERVATION_ONLY) {
      throw new BadRequestException('Product is not available for reservation')
    }

    // Validate quantity
    if (quantity < 1) {
      throw new BadRequestException('Quantity must be at least 1')
    }

    // Check per-user reservation limit (include CONFIRMED to prevent overbooking)
    if (product.reservationLimitPerUser) {
      const userExisting = await this.reservationRepo
        .createQueryBuilder('r')
        .where('r.productId = :productId', { productId })
        .andWhere('r.buyerId = :buyerId', { buyerId })
        .andWhere('r.status IN (:...statuses)', { statuses: [ReservationStatus.PENDING, ReservationStatus.DEPOSIT_PAID, ReservationStatus.CONFIRMED] })
        .getOne()
      const userReservedQty = userExisting ? (userExisting.quantity || 1) : 0
      if (userReservedQty + quantity > product.reservationLimitPerUser) {
        throw new BadRequestException(`You can only reserve up to ${product.reservationLimitPerUser} per user`)
      }
    }

    // Check total reservation limit (based on quantity sum, include CONFIRMED to prevent overbooking)
    const totalReserved = await this.reservationRepo
      .createQueryBuilder('r')
      .where('r.productId = :productId', { productId })
      .andWhere('r.status IN (:...statuses)', { statuses: [ReservationStatus.PENDING, ReservationStatus.DEPOSIT_PAID, ReservationStatus.CONFIRMED] })
      .select('COALESCE(SUM(r.quantity), 0)', 'total')
      .getRawOne()
    const currentTotal = parseInt(totalReserved?.total || '0', 10)
    const maxQty = product.reservationMax || product.quantity || 999

    if (currentTotal + quantity > maxQty) {
      throw new BadRequestException(`Only ${maxQty - currentTotal} spots remaining`)
    }

    // Check if buyer already has a pending/deposit_paid reservation
    const existing = await this.reservationRepo.findOne({
      where: { productId, buyerId, status: ReservationStatus.DEPOSIT_PAID }
    })
    if (existing) {
      throw new BadRequestException('You have already made a deposit-paid reservation for this product')
    }

    // Also check PENDING reservation (update quantity instead of creating new)
    const existingPending = await this.reservationRepo.findOne({
      where: { productId, buyerId, status: ReservationStatus.PENDING }
    })
    if (existingPending) {
      // R7: Validate new quantity doesn't exceed per-user limit (include CONFIRMED)
      if (product.reservationLimitPerUser && quantity > product.reservationLimitPerUser) {
        throw new BadRequestException(`You can only reserve up to ${product.reservationLimitPerUser} per user`)
      }

      // R7: Validate new quantity doesn't exceed total reservation max
      // Subtract the existing pending quantity, then check if new total exceeds max
      const totalExcludingThis = currentTotal - (existingPending.quantity || 1)
      if (totalExcludingThis + quantity > maxQty) {
        throw new BadRequestException(`Only ${maxQty - totalExcludingThis} spots remaining`)
      }

      // R7: Validate quantity is at least 1
      if (quantity < 1) {
        throw new BadRequestException('Quantity must be at least 1')
      }

      existingPending.quantity = quantity
      existingPending.depositAmount = depositAmount
      const updatedReservation = await this.reservationRepo.save(existingPending)

      // Update the existing deposit order's total price
      const existingOrder = await this.orderRepo.findOne({
        where: { reservationId: updatedReservation.id, type: OrderType.RESERVATION_DEPOSIT }
      })
      if (existingOrder) {
        existingOrder.totalPrice = depositAmount * quantity
        existingOrder.quantity = quantity
        existingOrder.notes = `預約訂金 - 預約ID: ${updatedReservation.id} x ${quantity}`
        await this.orderRepo.save(existingOrder)
        return { reservation: updatedReservation, order: existingOrder }
      }

      // Fallback: create new order if not found
      const order = await this.ordersService.create({
        buyerId,
        sellerId: product.sellerId,
        productId,
        type: OrderType.RESERVATION_DEPOSIT,
        status: OrderStatus.PENDING,
        totalPrice: depositAmount * quantity,
        quantity,
        notes: `預約訂金 - 預約ID: ${updatedReservation.id} x ${quantity}`,
        reservationId: updatedReservation.id,
      })
      return { reservation: updatedReservation, order }
    }

    // Create reservation record
    const reservation = this.reservationRepo.create({
      productId,
      buyerId,
      quantity,
      depositAmount,
      expireTime,
      status: ReservationStatus.PENDING,
    })
    const savedReservation = await this.reservationRepo.save(reservation)

    // Also create an order record for unified tracking
    const order = await this.ordersService.create({
      buyerId,
      sellerId: product.sellerId,
      productId,
      type: OrderType.RESERVATION_DEPOSIT,
      status: OrderStatus.PENDING,
      totalPrice: depositAmount * quantity,
      quantity,
      notes: `預約訂金 - 預約ID: ${savedReservation.id} x ${quantity}`,
      reservationId: savedReservation.id,
    })

    return { reservation: savedReservation, order }
  }

  async confirmDeposit(reservationId: string, userId: string): Promise<Reservation> {
    const reservation = await this.findOne(reservationId)
    
    // Only the seller of the product can confirm deposit
    const product = await this.productRepo.findOne({ where: { id: reservation.productId } })
    if (!product) {
      throw new NotFoundException('Product not found')
    }
    if (product.sellerId !== userId) {
      throw new ForbiddenException('Only the seller can confirm deposits')
    }

    if (reservation.status !== ReservationStatus.PENDING) {
      throw new BadRequestException('Reservation must be in pending status to confirm deposit')
    }
    
    reservation.status = ReservationStatus.DEPOSIT_PAID
    reservation.depositPaidAt = new Date()
    const saved = await this.reservationRepo.save(reservation)

    // R4: Create a RESERVATION_FULL (balance) order linked to this reservation
    const balanceAmount = Number(product.price) - Number(reservation.depositAmount)
    if (balanceAmount > 0) {
      // Check if balance order already exists
      const existingBalance = await this.orderRepo.findOne({
        where: { reservationId: reservation.id, type: OrderType.RESERVATION_FULL }
      })
      if (!existingBalance) {
        await this.ordersService.create({
          buyerId: reservation.buyerId,
          sellerId: product.sellerId,
          productId: reservation.productId,
          type: OrderType.RESERVATION_FULL,
          status: OrderStatus.PENDING,
          totalPrice: balanceAmount * (reservation.quantity || 1),
          quantity: reservation.quantity || 1,
          notes: `預約尾款 - 預約ID: ${reservation.id} (尾款 = ${product.price} - ${reservation.depositAmount} = ${balanceAmount})`,
          reservationId: reservation.id,
        })
      }
    }

    return saved
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

    reservation.status = ReservationStatus.CANCELLED
    return this.reservationRepo.save(reservation)
  }

  async getReservationCount(productId: string): Promise<number> {
    // Count PENDING, DEPOSIT_PAID, and CONFIRMED to prevent overselling
    return this.reservationRepo.count({
      where: [
        { productId, status: ReservationStatus.PENDING },
        { productId, status: ReservationStatus.DEPOSIT_PAID },
        { productId, status: ReservationStatus.CONFIRMED },
      ]
    })
  }

  async getProduct(productId: string): Promise<Product> {
    const product = await this.productRepo.findOne({ where: { id: productId } })
    if (!product) {
      throw new NotFoundException('Product not found')
    }
    return product
  }

  // R6: Cron job to expire overdue reservations every minute
  // Releases reserved spots by marking them EXPIRED
  @Cron('* * * * *')
  async expireOverdueReservations() {
    const now = new Date()
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
  }
}