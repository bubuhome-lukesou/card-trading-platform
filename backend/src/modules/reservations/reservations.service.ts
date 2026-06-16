import { Injectable, NotFoundException, BadRequestException, ForbiddenException, forwardRef, Inject } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
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

    // Check per-user reservation limit
    if (product.reservationLimitPerUser) {
      const userExisting = await this.reservationRepo
        .createQueryBuilder('r')
        .where('r.productId = :productId', { productId })
        .andWhere('r.buyerId = :buyerId', { buyerId })
        .andWhere('r.status IN (:...statuses)', { statuses: [ReservationStatus.PENDING, ReservationStatus.DEPOSIT_PAID] })
        .getOne()
      const userReservedQty = userExisting ? (userExisting.quantity || 1) : 0
      if (userReservedQty + quantity > product.reservationLimitPerUser) {
        throw new BadRequestException(`You can only reserve up to ${product.reservationLimitPerUser} per user`)
      }
    }

    // Check total reservation limit (based on quantity sum)
    const totalReserved = await this.reservationRepo
      .createQueryBuilder('r')
      .where('r.productId = :productId', { productId })
      .andWhere('r.status IN (:...statuses)', { statuses: [ReservationStatus.PENDING, ReservationStatus.DEPOSIT_PAID] })
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

    // Also check PENDING reservation
    const existingPending = await this.reservationRepo.findOne({
      where: { productId, buyerId, status: ReservationStatus.PENDING }
    })
    if (existingPending) {
      // Update quantity instead of creating new
      existingPending.quantity = quantity
      const updatedReservation = await this.reservationRepo.save(existingPending)
      const order = await this.ordersService.create({
        buyerId,
        sellerId: product.sellerId,
        productId,
        type: OrderType.RESERVATION_DEPOSIT,
        status: OrderStatus.PENDING,
        totalPrice: depositAmount * quantity,
        quantity,
        notes: `預約訂金 - 預約ID: ${updatedReservation.id} x ${quantity}`,
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
    })

    return { reservation: savedReservation, order }
  }

  async confirmDeposit(reservationId: string): Promise<Reservation> {
    const reservation = await this.findOne(reservationId)
    reservation.status = ReservationStatus.DEPOSIT_PAID
    reservation.depositPaidAt = new Date()
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
    return this.reservationRepo.count({
      where: { productId, status: ReservationStatus.DEPOSIT_PAID }
    })
  }

  async getProduct(productId: string): Promise<Product> {
    const product = await this.productRepo.findOne({ where: { id: productId } })
    if (!product) {
      throw new NotFoundException('Product not found')
    }
    return product
  }
}