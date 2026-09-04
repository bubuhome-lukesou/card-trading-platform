import { Injectable, NotFoundException, BadRequestException, ForbiddenException, forwardRef, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Order, OrderStatus, OrderType } from '../../entities/order.entity';
import { Product, ProductStatus, ListingType } from '../../entities/product.entity';
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

// Role-restricted transitions: who is allowed to trigger each transition
// buyer-only: only the buyer can trigger; seller-only: only the seller; either: both
const TRANSITION_PERMISSIONS: Record<string, Record<string, 'buyer' | 'seller' | 'either'>> = {
  [OrderStatus.PENDING]: { [OrderStatus.PENDING_PAID]: 'buyer', [OrderStatus.CANCELLED]: 'either' },
  [OrderStatus.PENDING_PAID]: { [OrderStatus.CONFIRMED]: 'seller', [OrderStatus.CANCELLED]: 'either' },
  [OrderStatus.CONFIRMED]: { [OrderStatus.SHIPPED]: 'seller', [OrderStatus.CANCELLED]: 'either' },
  [OrderStatus.SHIPPED]: { [OrderStatus.DELIVERED]: 'buyer' },
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
    private dataSource: DataSource,
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

  // Create order from validated data — internal use only (e.g. reservations, auction wins)
  async create(data: Partial<Order>) {
    if (!data.orderNumber) {
      data.orderNumber = 'ORD-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2,6).toUpperCase();
    }

    // Always fetch product to force-calculate totalPrice (prevent amount tampering)
    if (data.productId) {
      const product = await this.productRepo.findOne({ where: { id: data.productId } });
      if (product) {
        // Force sellerId from product (prevent injection)
        data.sellerId = product.sellerId;
        // Force totalPrice from product price (prevent frontend tampering)
        const qty = data.quantity || 1;
        if (data.type === OrderType.RESERVATION_DEPOSIT) {
          // For reservation deposits, use depositAmount * qty (already set by reservations service)
          // totalPrice should already be set — keep it as is
        } else {
          data.totalPrice = Number(product.price) * qty;
        }
      }
    }

    // Set required MySQL fields that TypeORM treats as optional
    if (!data.totalPrice && data.totalPrice !== 0) data.totalPrice = 0;
    if (data.shippingCost === undefined) data.shippingCost = 0;
    if (data.platformFee === undefined) data.platformFee = 0;
    if (!data.status) data.status = OrderStatus.PENDING;

    // Use transaction for order creation + stock decrement (atomic)
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const order = this.orderRepo.create(data);
      const savedOrder = await queryRunner.manager.save(order);

      // Only decrease product quantity for non-reservation orders
      if (data.productId && data.type !== OrderType.RESERVATION_DEPOSIT && data.type !== OrderType.RESERVATION_FULL) {
        const qty = data.quantity || 1;
        // Atomic stock decrement within the same transaction
        const result = await queryRunner.manager
          .createQueryBuilder()
          .update(Product)
          .set({ quantity: () => 'quantity - :qty' })
          .where('id = :id AND quantity >= :qty', { id: data.productId, qty })
          .execute();
        if (result.affected === 0) {
          throw new BadRequestException('Insufficient stock');
        }
      }

      await queryRunner.commitTransaction();
      return savedOrder;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // Create order from buyer request (with full validation)
  async createFromBuyer(buyerId: string, productId: string, quantity: number = 1): Promise<Order> {
    // Fetch and validate product
    const product = await this.productRepo.findOne({ where: { id: productId } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    // Product must be ACTIVE
    if (product.status !== ProductStatus.ACTIVE) {
      throw new BadRequestException('Product is not available for purchase');
    }
    // Buyer cannot buy their own product
    if (product.sellerId === buyerId) {
      throw new BadRequestException('You cannot purchase your own product');
    }
    // Product must allow direct purchase
    if (product.listingType === ListingType.AUCTION_ONLY || product.listingType === ListingType.RESERVATION_ONLY) {
      throw new BadRequestException('This product is not available for direct purchase');
    }
    // Validate quantity
    if (quantity < 1) {
      throw new BadRequestException('Quantity must be at least 1');
    }
    // Check stock
    if (product.quantity !== null && product.quantity !== undefined && product.quantity < quantity) {
      throw new BadRequestException(`Only ${product.quantity} in stock`);
    }

    return this.create({
      buyerId,
      sellerId: product.sellerId,
      productId,
      type: OrderType.DIRECT_PURCHASE,
      status: OrderStatus.PENDING,
      totalPrice: Number(product.price) * quantity,
      quantity,
    });
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
    // Must be in PENDING status (buyer uploads balance receipt before seller confirms)
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Cannot upload balance receipt in current order status');
    }
    order.balanceReceipt = receiptUrl;
    order.balanceTime = new Date();
    order.status = OrderStatus.PENDING_PAID;
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

    // Enforce role-based permissions for transitions
    const transitionRole = TRANSITION_PERMISSIONS[order.status]?.[status];
    if (transitionRole === 'buyer' && !isBuyer) {
      throw new ForbiddenException('Only the buyer can perform this action');
    }
    if (transitionRole === 'seller' && !isSeller) {
      throw new ForbiddenException('Only the seller can perform this action');
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