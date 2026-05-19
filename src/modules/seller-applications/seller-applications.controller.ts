import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common'
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

  // 管理員：獲取待審批申請列表
  @Get('pending')
  getPendingApplications() {
    return this.applicationsService.getPendingApplications()
  }

  // 管理員：獲取所有申請（分頁）
  @Get()
  getAllApplications(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.applicationsService.getAllApplications(+page, +limit)
  }

  // 管理員：審批通過
  @Patch(':id/approve')
  approve(@Param('id') id: string) {
    return this.applicationsService.approve(id)
  }

  // 管理員：審批拒絕
  @Patch(':id/reject')
  reject(@Param('id') id: string, @Body('reason') reason?: string) {
    return this.applicationsService.reject(id, reason)
  }
}
