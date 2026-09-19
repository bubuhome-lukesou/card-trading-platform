import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common'
import { HomeSettingsService } from './home-settings.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard, Roles } from '../auth/guards/roles.guard'

@Controller('home-settings')
export class HomeSettingsController {
  constructor(private readonly service: HomeSettingsService) {}

  // 公開：首頁讀取
  @Get('public')
  getPublic() {
    return this.service.getPublic()
  }

  // Admin 讀取
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get()
  get() {
    return this.service.get()
  }

  // Admin 更新
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Patch()
  update(@Body() body: any) {
    return this.service.update(body)
  }
}