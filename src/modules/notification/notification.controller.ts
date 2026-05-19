import { Controller, Post, Body, Get, Query } from '@nestjs/common';

export class NotificationDto {
  userId: string;
  type: 'email' | 'wechat' | 'in_app';
  template: string;
  data: Record<string, any>;
}

export class SendNotificationDto {
  userId: string;
  channel: 'email' | 'wechat' | 'in_app';
  title: string;
  message: string;
  metadata?: Record<string, any>;
}

@Controller('notifications')
export class NotificationController {
  // In-app notification storage (in production, use Redis or database)
  private notifications: Map<string, any[]> = new Map();

  /**
   * Send notification via specified channel
   * 
   * POST /notifications/send
   * 
   * Body:
   * {
   *   "userId": "user-123",
   *   "channel": "email" | "wechat" | "in_app",
   *   "title": "拍卖出价提醒",
   *   "message": "您关注的拍卖有新出价 HK$500",
   *   "metadata": { "auctionId": "auction-456", "amount": 500 }
   * }
   */
  @Post('send')
  async sendNotification(@Body() dto: SendNotificationDto) {
    // TODO: Implement actual notification sending based on channel
    // For now, just log and store in-memory

    switch (dto.channel) {
      case 'email':
        // TODO: Integrate with Gmail SMTP
        console.log(`[EMAIL] To: ${dto.userId}, Title: ${dto.title}, Message: ${dto.message}`);
        break;
      case 'wechat':
        // TODO: Integrate with WeChat Work API
        console.log(`[WECHAT] To: ${dto.userId}, Title: ${dto.title}, Message: ${dto.message}`);
        break;
      case 'in_app':
        // Store in-memory for now
        const userNotifications = this.notifications.get(dto.userId) || [];
        userNotifications.unshift({
          id: `notif-${Date.now()}`,
          ...dto,
          read: false,
          createdAt: new Date(),
        });
        this.notifications.set(dto.userId, userNotifications);
        break;
    }

    return {
      success: true,
      message: `Notification queued for ${dto.channel}`,
      notificationId: `notif-${Date.now()}`,
    };
  }

  /**
   * Get user's in-app notifications
   * 
   * GET /notifications?userId=user-123
   */
  @Get()
  async getNotifications(@Query('userId') userId: string) {
    return {
      notifications: this.notifications.get(userId) || [],
    };
  }

  /**
   * Mark notification as read
   * 
   * POST /notifications/read
   * { "userId": "user-123", "notificationId": "notif-123" }
   */
  @Post('read')
  async markAsRead(@Body() body: { userId: string; notificationId: string }) {
    const userNotifications = this.notifications.get(body.userId) || [];
    const notification = userNotifications.find(n => n.id === body.notificationId);
    if (notification) {
      notification.read = true;
    }
    return { success: true };
  }
}
