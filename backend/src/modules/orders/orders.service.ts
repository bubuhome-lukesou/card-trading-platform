import { Injectable, NotFoundException, BadRequestException, ForbiddenException, forwardRef, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThanOrEqual, In } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { Order, OrderStatus, OrderType } from '../../entities/order.entity';
import { Product, ProductStatus, ListingType } from '../../entities/product.entity';
import { ProductsService } from '../products/products.service';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../../entities/notification.entity';
import { OrderMessagesService } from '../order-messages/order-messages.service';
import { OrderMessageKind } from '../../entities/order-message.entity';
import { SellerProfile } from '../../entities/seller-profile.entity';

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
// S8: CONFIRMED→CANCELLED is seller-only — buyers cannot cancel orders the
// seller has already confirmed (goods may be prepared/shipped).
const TRANSITION_PERMISSIONS: Record<string, Record<string, 'buyer' | 'seller' | 'either'>> = {
  [OrderStatus.PENDING]: { [OrderStatus.PENDING_PAID]: 'buyer', [OrderStatus.CANCELLED]: 'either' },
  [OrderStatus.PENDING_PAID]: { [OrderStatus.CONFIRMED]: 'seller', [OrderStatus.CANCELLED]: 'either' },
  [OrderStatus.CONFIRMED]: { [OrderStatus.SHIPPED]: 'seller', [OrderStatus.CANCELLED]: 'seller' },
  [OrderStatus.SHIPPED]: { [OrderStatus.DELIVERED]: 'buyer' },
};

@Injectable()
export class OrdersService {
  // 每帳號未付款/未確認預約單上限（Luke 2026-11-01 定案：5 筆）
  static readonly OPEN_ORDER_LIMIT = 5;

  constructor(
    @InjectRepository(Order)
    private orderRepo: Repository<Order>,
    @InjectRepository(Product)
    private productRepo: Repository<Product>,
    @Inject(forwardRef(() => ProductsService))
    private productsService: ProductsService,
    private notificationService: NotificationService,
    private orderMessagesService: OrderMessagesService,
    private dataSource: DataSource,
  ) {}

  // ===== 營業時間校驗（2026-11-01）=====
  // spec JSON：{ "1": [["14:00","20:00"]], ... }；key=星期幾 1~7
  // 回 { ok:true } 或 { ok:false, reason }；spec 缺失 → ok（未設定不擋，前端只顯示提示）
  // 訂單上限錯誤文案（前端直接顯示）
  static readonly OPEN_ORDER_LIMIT_MSG = `您有 ${OrdersService.OPEN_ORDER_LIMIT} 筆未付款或未確認的訂單，請先處理後再下單`;

  static validateWithinBusinessHours(specRaw: string | null | undefined, when: Date): { ok: boolean; reason?: string } {
    if (!specRaw) return { ok: true };
    let spec: Record<string, [string, string][]>;
    try {
      spec = JSON.parse(specRaw);
    } catch {
      return { ok: true }; // Spec 格式錯不擋（自由文字營業時間 fallback）
    }
    if (!spec || typeof spec !== 'object') return { ok: true };
    const day = String(when.getDay() === 0 ? 7 : when.getDay()); // 1(週一)~7(週日)
    const ranges = spec[day];
    // 該日無設定或空 = 商家該日不營業
    if (!Array.isArray(ranges) || !ranges.length) {
      return { ok: false, reason: '商家當日不營業，請選擇營業時間內的時段' };
    }
    const hhmm = `${String(when.getHours()).padStart(2, '0')}:${String(when.getMinutes()).padStart(2, '0')}`;
    const inRange = ranges.some(([start, end]) => {
      if (!start || !end) return false;
      return hhmm >= start && hhmm <= end;
    });
    if (!inRange) {
      const pretty = ranges.map(([s, e]) => `${s}-${e}`).join('、');
      return { ok: false, reason: `所選時間超出營業時間（${pretty}），請重新選擇` };
    }
    return { ok: true };
  }

  // ===== 未付款訂單上限（2026-11-01）=====
  // 口徑：買家所有 status IN (pending,pending_paid) 訂單（直購/拍賣/預約訂金一視同仁）
  // 每 buyer 計 DISTINCT；RESERVATION_FULL 尾款單同訂金單共存但 pending 時同樣要行動，所以照計
  async assertOpenOrderLimit(buyerId: string) {
    const row = await this.orderRepo
      .createQueryBuilder('o')
      .where('o.buyerId = :buyerId', { buyerId })
      .andWhere('o.status IN (:...statuses)', { statuses: [OrderStatus.PENDING, OrderStatus.PENDING_PAID] })
      .select('COUNT(*)', 'c')
      .getRawOne();
    const count = Number(row?.c || 0);
    if (count >= OrdersService.OPEN_ORDER_LIMIT) {
      throw new BadRequestException(OrdersService.OPEN_ORDER_LIMIT_MSG);
    }
  }

  async findByBuyer(buyerId: string, page = 1, limit = 20, search?: string) {
    const qb = this.orderRepo
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.product', 'product')
      .leftJoinAndSelect('order.seller', 'seller')
      .where('order.buyerId = :buyerId', { buyerId })
      .orderBy('order.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);
    if (search && search.trim()) {
      const kw = `%${search.trim()}%`;
      qb.andWhere('(product.titleZh LIKE :kw OR product.titleEn LIKE :kw OR seller.nickname LIKE :kw)', { kw });
    }
    const [data, total] = await qb.getManyAndCount();
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
    // 未付款/未預約確認訂單上限（2026-11-01：每帳號 5 筆）
    await this.assertOpenOrderLimit(buyerId);
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
    if (product.listingType === ListingType.AUCTION || product.listingType === ListingType.RESERVATION) {
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
    const saved = await this.orderRepo.save(order);

    // 🔔 通知買家：賣家已確認收款
    this.notificationService.notify({
      userId: order.buyerId,
      type: NotificationType.ORDER_UPDATE,
      title: '訂單已確認',
      message: `賣家已確認收到您的付款（訂單 ${order.orderNumber}）`,
      link: '/user/orders',
    }).catch(() => {});

    return saved;
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
    const saved = await this.orderRepo.save(order);

    // 🔔 通知賣家：買家上傳了付款憑證待確認
    this.notificationService.notify({
      userId: order.sellerId,
      type: NotificationType.PAYMENT_RECEIVED,
      title: '收到付款憑證',
      message: `買家已上傳「${order.product?.titleZh || order.product?.titleEn || order.orderNumber}」的付款憑證，請確認收款`,
      link: '/seller/orders',
    }).catch(() => {});

    return saved;
  }

  async updateBalanceReceipt(orderId: string, receiptUrl: string, userId: string): Promise<Order> {
    const order = await this.findOne(orderId);
    // Only buyer can upload receipt
    if (order.buyerId !== userId) {
      throw new ForbiddenException('Only the buyer can upload receipts');
    }
    // 預約流程：PENDING=待付訂金（尾款未到時間不應上傳）；CONFIRMED=訂金已確認待付尾款（上傳後完成交易）
    // （2026-09-20 修復：舊版只允許 PENDING，令「待付尾款」階段的上傳按鈕全部 400 卡死預約流程）
    const isReservation = order.type === OrderType.RESERVATION_DEPOSIT || order.type === OrderType.RESERVATION_FULL;
    if (isReservation && order.status === OrderStatus.CONFIRMED) {
      order.balanceReceipt = receiptUrl;
      order.balanceTime = new Date();
      order.status = OrderStatus.DELIVERED; // 尾款憑證上傳後直接完成（賣家另有到店確認流程）
      const saved = await this.orderRepo.save(order);
      this.notificationService.notify({
        userId: order.sellerId,
        type: NotificationType.PAYMENT_RECEIVED,
        title: '收到尾款憑證',
        message: `買家已上傳「${order.product?.titleZh || order.product?.titleEn || order.orderNumber}」的尾款憑證，請確認`,
        link: '/seller/orders',
      }).catch(() => {});
      return saved;
    }
    // 非預約單維持原邏輯：僅 PENDING 可上傳尾款憑證（走 pending_paid 待確認）
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Cannot upload balance receipt in current order status');
    }
    order.balanceReceipt = receiptUrl;
    order.balanceTime = new Date();
    order.status = OrderStatus.PENDING_PAID;
    const saved = await this.orderRepo.save(order);

    // 🔔 通知賣家：買家上傳了尾款憑證待確認
    this.notificationService.notify({
      userId: order.sellerId,
      type: NotificationType.PAYMENT_RECEIVED,
      title: '收到尾款憑證',
      message: `買家已上傳「${order.product?.titleZh || order.product?.titleEn || order.orderNumber}」的尾款憑證，請確認`,
      link: '/seller/orders',
    }).catch(() => {});

    return saved;
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

    const saved = await this.orderRepo.save(order);

    // 🔔 通知對方：狀態變更（買家賣家互通知）
    try {
      const productTitle = order.product?.titleZh || order.product?.titleEn || order.orderNumber;
      const statusText: Record<string, string> = {
        confirmed: '賣家已確認您的訂單',
        shipped: '您的訂單已發貨',
        delivered: '訂單已完成',
        cancelled: '訂單已取消',
        pending_paid: '訂單待確認',
      };
      const msg = statusText[status] || `訂單狀態更新為 ${status}`;
      // 通知對方（操作者以外的另一方）
      const targetUserId = isBuyer ? order.sellerId : order.buyerId;
      this.notificationService.notify({
        userId: targetUserId,
        type: NotificationType.ORDER_UPDATE,
        title: '訂單更新',
        message: `${msg}（${productTitle}）`,
        link: isBuyer ? '/seller/orders' : '/user/orders',
      }).catch(() => {});
    } catch (e) {
      // non-fatal
    }

    return saved;
  }

  // ===== 攞貨時間協調（2026-11-01）=====
  // 買家提出/重提攞貨時間。pending/pending_paid 階段可提；提出後 pending→pending_paid 待商家確認。
  // 營業時間外拒絕（商家已設定結構化時間時）。商家確認後買家唔可以再改（要商家先可以重開）。
  async proposePickupTime(orderId: string, userId: string, pickupTimeRaw: string): Promise<Order> {
    const order = await this.findOne(orderId);
    if (order.buyerId !== userId) {
      throw new ForbiddenException('只有買家可以提出攞貨時間');
    }
    if (![OrderStatus.PENDING, OrderStatus.PENDING_PAID].includes(order.status)) {
      throw new BadRequestException('目前訂單狀態不可提出攞貨時間');
    }
    if (!pickupTimeRaw || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(pickupTimeRaw)) {
      throw new BadRequestException('缺少有效嘅攞貨時間');
    }
    const when = new Date(pickupTimeRaw);
    if (isNaN(when.getTime())) throw new BadRequestException('攞貨時間格式無效');
    if (when.getTime() < Date.now()) {
      throw new BadRequestException('攞貨時間不可以是過去時間');
    }
    if (order.pickupConfirmStatus === 'confirmed') {
      throw new BadRequestException('商家已確認時間，如需更改請聯絡商家');
    }

    // 營業時間校驗（商家 seller_profiles.businessHoursSpec）
    const profile = await this.dataSource.getRepository(SellerProfile).findOne({ where: { userId: order.sellerId } });
    const check = OrdersService.validateWithinBusinessHours(profile?.businessHoursSpec, when);
    if (!check.ok) throw new BadRequestException(check.reason);

    const isRepropose = !!order.pickupProposalTime;
    order.pickupProposalTime = pickupTimeRaw;
    order.pickupConfirmStatus = 'proposed';
    // 新時間提出 = 訂單即刻進入「待商家確認」（憑證可後補 — Luke 10 月定案維持鎖單要憑證，
    // 但純 pending（未上傳任何憑證）先允許轉 pending_paid；已 pending_paid 不變）
    if (order.status === OrderStatus.PENDING && !order.transferReceipt) {
      order.status = OrderStatus.PENDING_PAID;
    }
    const saved = await this.orderRepo.save(order);

    // 寫入聊天流（time_proposal 系統消息）
    const fmt = new Date(pickupTimeRaw).toLocaleString('zh-MO', { hour12: false });
    this.orderMessagesService
      .addSystemMessage(
        orderId,
        OrderMessageKind.TIME_PROPOSAL,
        isRepropose
          ? `買家更改了取貨時間：${fmt}，等待商家確認`
          : `買家提出了取貨時間：${fmt}，等待商家確認`,
        pickupTimeRaw,
        userId,
      )
      .catch(() => {});

    // 🔔 通知商家
    this.notificationService.notify({
      userId: order.sellerId,
      type: NotificationType.ORDER_UPDATE,
      title: '買家提出攞貨時間',
      message: `買家提出「${fmt}」攞貨，請喺訂單聊天確認`,
      link: '/seller/orders',
    }).catch(() => {});

    return saved;
  }

  // 商家確認攞貨時間 → pickupTime 寫入 + pickupConfirmStatus=confirmed
  async confirmPickupTime(orderId: string, userId: string): Promise<Order> {
    const order = await this.findOne(orderId);
    if (order.sellerId !== userId) {
      throw new ForbiddenException('只有商家可以確認攞貨時間');
    }
    if (order.pickupConfirmStatus !== 'proposed' || !order.pickupProposalTime) {
      throw new BadRequestException('沒有待確認的攞貨時間');
    }
    const when = new Date(order.pickupProposalTime);
    order.pickupTime = when;
    order.pickupConfirmStatus = 'confirmed';
    const saved = await this.orderRepo.save(order);

    const fmt = when.toLocaleString('zh-MO', { hour12: false });
    this.orderMessagesService
      .addSystemMessage(orderId, OrderMessageKind.SYSTEM, `商家已確認取貨時間：${fmt}`, null, userId)
      .catch(() => {});
    this.notificationService.notify({
      userId: order.buyerId,
      type: NotificationType.ORDER_UPDATE,
      title: '攞貨時間已確認',
      message: `商家已確認「${fmt}」攞貨，請準時到店`,
      link: '/user/orders',
    }).catch(() => {});

    return saved;
  }

  // 買家確認取貨 → delivered（完成訂單）+ 進入互評期
  async confirmPickup(orderId: string, userId: string): Promise<Order> {
    const order = await this.findOne(orderId);
    if (order.buyerId !== userId) {
      throw new ForbiddenException('只有買家可以確認取貨');
    }
    if (order.pickupConfirmStatus !== 'confirmed' || !order.pickupTime) {
      throw new BadRequestException('商家尚未確認攞貨時間');
    }
    if (order.status === OrderStatus.DELIVERED || order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('訂單已完成或已取消');
    }
    order.pickupConfirmedAt = new Date();
    order.status = OrderStatus.DELIVERED;
    order.deliveryTime = new Date();
    const saved = await this.orderRepo.save(order);

    this.orderMessagesService
      .addSystemMessage(orderId, OrderMessageKind.SYSTEM, '買家已確認取貨，訂單完成', null, userId)
      .catch(() => {});
    this.notificationService.notify({
      userId: order.sellerId,
      type: NotificationType.ORDER_UPDATE,
      title: '訂單已完成',
      message: '買家已確認取貨，可以互相評價',
      link: '/seller/orders',
    }).catch(() => {});

    return saved;
  }

  // ===== 自動取消 cron（2026-11-01）=====
  // 買家生成訂單 24 小時內未付款（pending）且未提出攞貨時間 → 自動取消
  // 每 10 分鐘跑一次；取消時通知兩方
  @Cron('*/10 * * * *')
  async autoCancelStaleOrders() {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const stale = await this.orderRepo
      .createQueryBuilder('o')
      .where('o.status = :status', { status: OrderStatus.PENDING })
      .andWhere('o.createdAt <= :cutoff', { cutoff })
      .andWhere('(o.pickupProposalTime IS NULL OR o.pickupProposalTime = \'\')')
      .getMany();

    for (const order of stale) {
      try {
        order.status = OrderStatus.CANCELLED;
        order.notes = (order.notes ? order.notes + ' | ' : '') + '24小時未付款未預約自動取消';
        await this.orderRepo.save(order);
        // 非預約單回補庫存（同手動取消一致）
        if (order.productId && order.type !== OrderType.RESERVATION_DEPOSIT && order.type !== OrderType.RESERVATION_FULL) {
          await this.productsService.increaseQuantity(order.productId, order.quantity || 1).catch(() => {});
        }
        this.notificationService.notify({
          userId: order.buyerId,
          type: NotificationType.ORDER_UPDATE,
          title: '訂單已自動取消',
          message: `訂單 ${order.orderNumber} 超過 24 小時未付款且未預約攞貨，已自動取消`,
          link: '/user/orders',
        }).catch(() => {});
        this.notificationService.notify({
          userId: order.sellerId,
          type: NotificationType.ORDER_UPDATE,
          title: '訂單已自動取消',
          message: `買家超過 24 小時未付款且未預約，訂單已自動取消`,
          link: '/seller/orders',
        }).catch(() => {});
      } catch (err) {
        console.error(`[Cron] autoCancel order ${order.id} failed:`, err);
      }
    }
    if (stale.length > 0) {
      console.log(`[Cron] auto-cancelled ${stale.length} stale orders (24h unpaid)`);
    }
  }
}