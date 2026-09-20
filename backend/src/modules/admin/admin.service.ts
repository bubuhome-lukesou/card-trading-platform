import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../../entities/user.entity';
import { Settings } from '../../entities/settings.entity';
import { Product, ProductStatus } from '../../entities/product.entity';
import { Order, OrderStatus, OrderType } from '../../entities/order.entity';
import { Auction, AuctionStatus } from '../../entities/auction.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Settings)
    private settingsRepo: Repository<Settings>,
    @InjectRepository(Product)
    private productRepo: Repository<Product>,
    @InjectRepository(Order)
    private orderRepo: Repository<Order>,
    @InjectRepository(Auction)
    private auctionRepo: Repository<Auction>,
  ) {}

  async getUsers(page = 1, limit = 20, role?: string, status?: string, search?: string) {
    const where: any = {};
    if (role) where.role = role;
    if (status) where.status = status;
    if (search && search.trim()) {
      const kw = search.trim();
      where.nickname = kw;
      where.email = kw;
    }
    const qb = this.userRepo
      .createQueryBuilder('user')
      .orderBy('user.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);
    if (where.role) qb.andWhere('user.role = :role', { role: where.role });
    if (where.status) qb.andWhere('user.status = :status', { status: where.status });
    if (where.nickname) {
      qb.andWhere('(user.nickname LIKE :kw OR user.email LIKE :kw OR user.phone LIKE :kw)', { kw: `%${where.nickname}%` });
    }
    const [data, total] = await qb.getManyAndCount();

    // 累計消費（真數）：confirmed/shipped/delivered 訂單總額（同全站收款口徑，預約單冇經過 paid）
    const spendRows = await this.orderRepo
      .createQueryBuilder('order')
      .select('order.buyerId', 'buyerId')
      .addSelect('COALESCE(SUM(order.totalPrice), 0)', 'totalSpend')
      .addSelect('COUNT(order.id)', 'orderCount')
      .where('order.status IN (:...statuses)', { statuses: [OrderStatus.CONFIRMED, OrderStatus.SHIPPED, OrderStatus.DELIVERED] })
      .groupBy('order.buyerId')
      .getRawMany();
    const spendMap = new Map<string, { totalSpend: number; orderCount: number }>();
    for (const row of spendRows) {
      spendMap.set(row.buyerId, { totalSpend: Number(row.totalSpend || 0), orderCount: Number(row.orderCount || 0) });
    }

    // 安全：移除敏感欄位（password hash / 驗證 token）— 同 getRecentUsers 一致
    return {
      data: data.map(u => {
        const { password, emailVerificationToken, resetPasswordToken, ...safe } = u as any;
        const spend = spendMap.get(u.id) || { totalSpend: 0, orderCount: 0 };
        return { ...safe, totalSpend: spend.totalSpend, orderCount: spend.orderCount };
      }),
      total, page, limit,
    };
  }

  async getUser(id: string) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) return null;
    // 安全：移除敏感欄位
    const { password, emailVerificationToken, resetPasswordToken, ...safe } = user as any;
    return safe;
  }

  async updateUser(id: string, data: { role?: string; status?: string; nickname?: string }) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new Error('User not found');
    if (data.role) user.role = data.role as any;
    if (data.status) user.status = data.status as any;
    if (data.nickname) user.nickname = data.nickname;
    return this.userRepo.save(user);
  }

  async getStats() {
    const totalUsers = await this.userRepo.count();
    const totalSellers = await this.userRepo.count({ where: { role: UserRole.SELLER } });
    const totalAdmins = await this.userRepo.count({ where: { role: UserRole.ADMIN } });

    // 商品統計（排除軟刪除）
    const [totalProducts, activeProducts] = await Promise.all([
      this.productRepo.count({ where: [{ status: ProductStatus.ACTIVE }, { status: ProductStatus.SOLD }, { status: ProductStatus.ENDED }] }),
      this.productRepo.count({ where: { status: ProductStatus.ACTIVE } }),
    ]);

    // 訂單統計 + 平台收入（已完成訂單總額）
    const [totalOrders, pendingOrders, revenueResult] = await Promise.all([
      this.orderRepo.count(),
      this.orderRepo.count({ where: { status: OrderStatus.PENDING_PAID } }),
      this.orderRepo
        .createQueryBuilder('order')
        .select('COALESCE(SUM(order.totalPrice), 0)', 'revenue')
        .where('order.status = :status', { status: OrderStatus.DELIVERED })
        .getRawOne(),
    ]);

    // 拍賣統計
    const [totalAuctions, activeAuctions] = await Promise.all([
      this.auctionRepo.count(),
      this.auctionRepo.count({ where: { status: AuctionStatus.ACTIVE } }),
    ]);

    const totalRevenue = parseFloat(revenueResult?.revenue || '0');

    return {
      totalUsers, totalSellers, totalAdmins,
      totalProducts, activeProducts,
      totalOrders, pendingOrders, totalRevenue,
      totalAuctions, activeAuctions,
    };
  }

  // 最新用戶（儀表板用）
  async getRecentUsers(limit = 5) {
    const users = await this.userRepo.find({
      order: { createdAt: 'DESC' },
      take: limit,
    });
    // 安全：移除敏感欄位
    return users.map(u => {
      const { password, emailVerificationToken, resetPasswordToken, ...safe } = u as any;
      return safe;
    });
  }

  async getSettings(): Promise<Settings> {
    let settings = await this.settingsRepo.findOne({ where: { id: 1 } });
    if (!settings) {
      settings = this.settingsRepo.create({ id: 1, pickupInfo: '', pickupQrCode: '' });
      settings = await this.settingsRepo.save(settings);
    }
    return settings;
  }

  async updateSettings(data: { pickupInfo?: string; pickupQrCode?: string }): Promise<Settings> {
    const settings = await this.getSettings();
    if (data.pickupInfo !== undefined) settings.pickupInfo = data.pickupInfo;
    if (data.pickupQrCode !== undefined) settings.pickupQrCode = data.pickupQrCode;
    return this.settingsRepo.save(settings);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    // Verify current password (only if user has a password set)
    if (user.password) {
      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) throw new Error('當前密碼不正確');
    }

    // Hash and set new password
    user.password = await bcrypt.hash(newPassword, 10);
    await this.userRepo.save(user);
  }
}

