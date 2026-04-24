import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../../entities/order.entity';
import { Product } from '../../entities/product.entity';
import { OrderStatus } from '../../entities/order.entity';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private orderRepo: Repository<Order>,
    @InjectRepository(Product)
    private productRepo: Repository<Product>,
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
      relations: ['product'],
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
    return this.orderRepo.save(order);
  }

  async updateStatus(id: string, status: string) {
    const order = await this.findOne(id);
    order.status = status as any;
    return this.orderRepo.save(order);
  }
}
