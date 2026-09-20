import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Req } from '@nestjs/common'
import { Request } from 'express'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard, Roles } from '../auth/guards/roles.guard'
import { SellerApplicationsService } from './seller-applications.service'

@Controller('seller-applications')
export class SellerApplicationsController {
  constructor(private applicationsService: SellerApplicationsService) {}

  // 公開：提交入駐申請（無需登入）
  @Post()
  create(@Body() body: {
    email: string
    nickname: string
    password: string
    storeName: string
    storeDescription?: string
    phone?: string
    pickupInfo?: string
    pickupQrCode?: string
  }) {
    return this.applicationsService.createWithAccount(body)
  }

  // 公開：查看申請狀態（通過電郵）
  @Get('status')
  getStatusByEmail(@Query('email') email: string) {
    return this.applicationsService.getByEmail(email)
  }

  // ===== 以下全部管理員專屬（2026-09-20 加 guard：原本整個 controller 無鑒權，匿名可讀全部申請連密碼 hash） =====

  // 管理員：獲取待審批申請列表
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('pending')
  getPendingApplications(@Req() req: Request) {
    void req
    return this.applicationsService.getPendingApplications()
  }

  // 管理員：獲取所有申請（分頁 + 狀態/搜尋篩選）
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get()
  getAllApplications(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.applicationsService.getAllApplications(+page, +limit, status, search)
  }

  // 管理員：審批通過
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Patch(':id/approve')
  approve(@Param('id') id: string) {
    return this.applicationsService.approve(id)
  }

  // 管理員：審批拒絕
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Patch(':id/reject')
  reject(@Param('id') id: string, @Body('reason') reason?: string) {
    return this.applicationsService.reject(id, reason)
  }
}