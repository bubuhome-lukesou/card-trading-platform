import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../../entities/user.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async getUsers(page = 1, limit = 20, role?: string) {
    const where: any = {};
    if (role) where.role = role;
    const [data, total] = await this.userRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit };
  }

  async getUser(id: string) {
    return this.userRepo.findOne({ where: { id } });
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
    return { totalUsers, totalSellers, totalAdmins };
  }
}

