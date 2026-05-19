import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Settings } from './entities/settings.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @InjectRepository(Settings)
    private settingsRepo: Repository<Settings>,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('api/public/settings')
  async getPublicSettings() {
    let settings = await this.settingsRepo.findOne({ where: { id: 1 } });
    if (!settings) {
      settings = this.settingsRepo.create({ id: 1, pickupInfo: '', pickupQrCode: '' });
      settings = await this.settingsRepo.save(settings);
    }
    return {
      pickupInfo: settings.pickupInfo,
      pickupQrCode: settings.pickupQrCode,
    };
  }
}
