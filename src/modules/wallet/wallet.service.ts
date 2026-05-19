import { Injectable } from '@nestjs/common';
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
    const user = await this.userRepo.findOne({ where: { id: userId } });
    const balanceBefore = Number(user.balance);
    user.balance = balanceBefore + amount;
    await this.userRepo.save(user);
    const tx = this.txRepo.create({
      userId, amount, type: TransactionType.DEPOSIT,
      description, balanceBefore, balanceAfter: Number(user.balance),
    });
    return this.txRepo.save(tx);
  }

  async withdraw(userId: string, amount: number, description = 'Withdrawal') {
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
