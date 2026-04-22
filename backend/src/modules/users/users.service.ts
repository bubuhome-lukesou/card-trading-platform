import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async findById(id: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { email } });
  }

  async updateProfile(id: string, data: { nickname?: string; phone?: string; avatar?: string }) {
    const user = await this.findById(id);
    if (data.nickname) user.nickname = data.nickname;
    if (data.phone !== undefined) user.phone = data.phone;
    if (data.avatar !== undefined) user.avatar = data.avatar;
    return this.userRepo.save(user);
  }

  async updatePassword(id: string, currentPassword: string, newPassword: string) {
    const user = await this.findById(id);
    const matched = await bcrypt.compare(currentPassword, user.password);
    if (!matched) throw new Error('Current password is incorrect');
    user.password = await bcrypt.hash(newPassword, 10);
    return this.userRepo.save(user);
  }

  async updateBalance(id: string, amount: number) {
    const user = await this.findById(id);
    user.balance = Number(user.balance) + amount;
    return this.userRepo.save(user);
  }

  async findAll(page = 1, limit = 20) {
    const [data, total] = await this.userRepo.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });
    return { data, total, page, limit };
  }

  async updateRole(id: string, role: string) {
    const user = await this.findById(id);
    (user as any).role = role;
    return this.userRepo.save(user);
  }
}

