import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WalletTransaction, TransactionType } from '../../entities/wallet.entity';
import { User } from '../../entities/user.entity';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(WalletTransaction)
    private txRepo: Repository<WalletTransaction>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async getBalance(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    return { balance: user?.balance ?? 0 };
  }

  async getTransactions(userId: string, page = 1, limit = 20) {
    const [data, total] = await this.txRepo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit };
  }

  async deposit(userId: string, amount: number, description = 'Deposit') {
    // 安全：充值必須經支付網關；未接入前禁用（前端按鈕已隱藏，此處封 API 防自我鑄幣）
    throw new ForbiddenException('充值功能暫未開放（等待支付網關接入）');
  }

  async withdraw(userId: string, amount: number, description = 'Withdrawal') {
    // 安全：提現需審批流程；未接入前禁用
    throw new ForbiddenException('提現功能暫未開放（等待審批流程上線）');
  }

  /** 保留給未來支付網關回調/admin 手動入數使用（現時無調用方） */
  async creditBalance(userId: string, amount: number, description: string) {
    if (!amount || Number(amount) <= 0) throw new BadRequestException('Invalid amount');
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');
    const balanceBefore = Number(user.balance);
    user.balance = balanceBefore + amount;
    await this.userRepo.save(user);
    const tx = this.txRepo.create({
      userId, amount, type: TransactionType.DEPOSIT,
      description, balanceBefore, balanceAfter: Number(user.balance),
    });
    return this.txRepo.save(tx);
  }

  /** 舊直接扣款邏輯保留參考（未使用） */
  private async withdrawLegacy(userId: string, amount: number, description = 'Withdrawal') {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (Number(user.balance) < amount) throw new Error('Insufficient balance');
    const balanceBefore = Number(user.balance);
    user.balance = balanceBefore - amount;
    await this.userRepo.save(user);
    const tx = this.txRepo.create({
      userId, amount: -amount, type: TransactionType.WITHDRAWAL,
      description, balanceBefore, balanceAfter: Number(user.balance),
    });
    return this.txRepo.save(tx);
  }
}
