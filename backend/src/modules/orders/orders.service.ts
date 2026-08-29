import { Injectable, NotFoundException, BadRequestException, ForbiddenException, forwardRef, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus, OrderType } from '../../entities/order.entity';
import { Product } from '../../entities/product.entity';
import { ProductsService } from '../products/products.service';

// Valid order status transitions (state machine)
const VALID_TRANSITIONS: Record<string, string[]> = {
  [OrderStatus.PENDING]: [OrderStatus.PENDING_PAID, OrderStatus.CANCELLED],
  [OrderStatus.PENDING_PAID]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.REFUNDED]: [],
};

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private orderRepo: Repository<Order>,
    @InjectRepository(Product)
    private productRepo: Repository<Product>,
    @Inject(forwardRef(() => ProductsService))
    private productsService: ProductsService,
  ) {}

  async findByBuyer(buyerId: string, page = 1, limit = 20) {
    const [data, total] = await this.orderRepo.findAndCount({
      where: { buyerId },
      relations: ['product', 'seller'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit };
  }

  async findBySeller(sellerId: string, page = 1, limit = 20) {
    const [data, total] = await this.orderRepo.findAndCount({
      where: { sellerId },
      relations: ['product', 'buyer'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit };
  }

  async findOne(id: string) {
    const order = await this.orderRepo.findOne({ 
      where: { id },
      relations: ['product', 'buyer', 'seller'],
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async create(data: Partial<Order>) {
    if (!data.orderNumber) {
      data.orderNumber = 'ORD-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2,6).toUpperCase();
    }
    
    // If productId is provided but totalPrice is not set, calculate from product
    if (!data.totalPrice && data.totalPrice !== 0 && data.productId) {
      const product = await this.productRepo.findOne({ where: { id: data.productId } });
      if (product) {
        data.totalPrice = product.price * (data.quantity || 1);
        data.sellerId = product.sellerId;
      }
    }
    
    // Set sellerId from product if not provided
    if (!data.sellerId && data.productId) {
      const product = await this.productRepo.findOne({ where: { id: data.productId } });
      if (product) data.sellerId = product.sellerId;
    }
    
    // Set required MySQL fields that TypeORM treats as optional
    if (!data.totalPrice && data.totalPrice !== 0) data.totalPrice = 0;
    if (data.shippingCost === undefined) data.shippingCost = 0;
    if (data.platformFee === undefined) data.platformFee = 0;
    if (!data.status) data.status = OrderStatus.PENDING;
    const order = this.orderRepo.create(data);
    const savedOrder = await this.orderRepo.save(order);

    // Only decrease product quantity for non-reservation orders
    // Reservation orders manage availability via reservationCount, not product.quantity
    if (data.productId && data.type !== OrderType.RESERVATION_DEPOSIT && data.type !== OrderType.RESERVATION_FULL) {
      const qty = data.quantity || 1;
      try {
        await this.productsService.decreaseQuantity(data.productId, qty);
      } catch (err) {
        // If stock decrement fails, cancel the order to maintain consistency
        savedOrder.status = OrderStatus.CANCELLED;
        await this.orderRepo.save(savedOrder);
        throw err;
      }
    }

    return savedOrder;
  }

  async confirmPayment(orderId: string, userId: string): Promise<Order> {
    const order = await this.findOne(orderId);
    // Only seller can confirm payment
    if (order.sellerId !== userId) {
      throw new ForbiddenException('Only the seller can confirm payment');
    }
    // Must be in PENDING_PAID status
    if (order.status !== OrderStatus.PENDING_PAID) {
      throw new BadRequestException('Order must be in pending_paid status to confirm payment');
    }
    order.status = OrderStatus.CONFIRMED;
    order.paymentTime = new Date();
    return this.orderRepo.save(order);
  }

  async updateTransferReceipt(orderId: string, receiptUrl: string, userId: string): Promise<Order> {
    const order = await this.findOne(orderId);
    // Only buyer can upload receipt
    if (order.buyerId !== userId) {
      throw new ForbiddenException('Only the buyer can upload receipts');
    }
    // Must be in PENDING status
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Cannot upload receipt in current order status');
    }
    order.transferReceipt = receiptUrl;
    order.transferTime = new Date();
    order.status = OrderStatus.PENDING_PAID;
    return this.orderRepo.save(order);
  }

  async updateBalanceReceipt(orderId: string, receiptUrl: string, userId: string): Promise<Order> {
    const order = await this.findOne(orderId);
    // Only buyer can upload receipt
    if (order.buyerId !== userId) {
      throw new ForbiddenException('Only the buyer can upload receipts');
    }
    order.balanceReceipt = receiptUrl;
    order.balanceTime = new Date();
    return this.orderRepo.save(order);
  }

  async updateStatus(id: string, status: string, userId: string) {
    const order = await this.findOne(id);
    
    // Check permission — buyer or seller depending on transition
    const isBuyer = order.buyerId === userId;
    const isSeller = order.sellerId === userId;
    if (!isBuyer && !isSeller) {
      throw new ForbiddenException('You do not have permission to update this order');
    }

    // Validate state machine transition
    const allowed = VALID_TRANSITIONS[order.status] || [];
    if (!allowed.includes(status)) {
      throw new BadRequestException(
        `Cannot transition from ${order.status} to ${status}`
      );
    }

    // If cancelling, restore product stock (only for non-reservation orders)
    if (status === OrderStatus.CANCELLED && order.productId && 
        order.type !== OrderType.RESERVATION_DEPOSIT && order.type !== OrderType.RESERVATION_FULL) {
      const qty = order.quantity || 1;
      await this.productsService.increaseQuantity(order.productId, qty);
    }

    order.status = status as any;
    
    // Set timestamps
    if (status === OrderStatus.SHIPPED) {
      order.shippingTime = new Date();
    } else if (status === OrderStatus.DELIVERED) {
      order.deliveryTime = new Date();
    }
    
    return this.orderRepo.save(order);
  }
}