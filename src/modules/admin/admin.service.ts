import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../../entities/user.entity';
import { Settings } from '../../entities/settings.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Settings)
    private settingsRepo: Repository<Settings>,
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
}

