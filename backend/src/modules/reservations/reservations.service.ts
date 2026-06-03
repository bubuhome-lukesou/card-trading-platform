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

  async create(productId: string, buyerId: string, depositAmount: number, expireTime: Date): Promise<{ reservation: Reservation; order: Order }> {
    // Check product exists and is reservation type
    const product = await this.productRepo.findOne({ where: { id: productId } })
    if (!product) {
      throw new NotFoundException('Product not found')
    }
    if (product.listingType !== ListingType.RESERVATION_ONLY) {
      throw new BadRequestException('Product is not available for reservation')
    }

    // Check reservation limit
    if (product.reservationMax) {
      const count = await this.reservationRepo.count({
        where: { productId, status: ReservationStatus.DEPOSIT_PAID }
      })
      if (count >= product.reservationMax) {
        throw new BadRequestException('Reservation limit reached')
      }
    }

    // Check if buyer already reserved
    const existing = await this.reservationRepo.findOne({
      where: { productId, buyerId, status: ReservationStatus.DEPOSIT_PAID }
    })
    if (existing) {
      throw new BadRequestException('You have already made a reservation for this product')
    }

    // Create reservation record
    const reservation = this.reservationRepo.create({
      productId,
      buyerId,
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
      totalPrice: depositAmount,
      quantity: 1,
      notes: `預約訂金 - 預約ID: ${savedReservation.id}`,
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