import { Controller, Get, Post, Param, Body, Query, UseGuards, Req, NotFoundException, ForbiddenException } from '@nestjs/common'
import { Request } from 'express'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { NotificationService } from './notification.service'

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  /** 用戶通知列表（分頁 + 未讀數） */
  @Get()
  async getNotifications(
    @Req() req: Request,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const userId = (req.user as any).id
    return this.notificationService.findByUser(userId, Number(page), Number(limit))
  }

  /** 未讀數量（鈴鐺紅點輪詢） */
  @Get('unread-count')
  async getUnreadCount(@Req() req: Request) {
    const userId = (req.user as any).id
    const count = await this.notificationService.getUnreadCount(userId)
    return { count }
  }

  /** 標記單一通知已讀 */
  @Post(':id/read')
  async markRead(@Req() req: Request, @Param('id') id: string) {
    const userId = (req.user as any).id
    return this.notificationService.markRead(userId, id)
  }

  /** 全部標記已讀 */
  @Post('read-all')
  async markAllRead(@Req() req: Request) {
    const userId = (req.user as any).id
    return this.notificationService.markAllRead(userId)
  }
}