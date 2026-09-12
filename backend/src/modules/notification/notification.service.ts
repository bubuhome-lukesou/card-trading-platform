import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AppNotification, NotificationType } from '../../entities/notification.entity'
import { User } from '../../entities/user.entity'

export interface NotifyInput {
  userId: string
  type: NotificationType
  title: string
  message: string
  link?: string
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger('NotificationService')

  constructor(
    @InjectRepository(AppNotification)
    private notificationRepo: Repository<AppNotification>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  /**
   * 建立站內通知（檢查用戶通知偏好）
   * 失敗不會拋出 — 通知系統故障不應影響主業務流程
   */
  async notify(input: NotifyInput): Promise<void> {
    try {
      // 檢查用戶是否開啟了此類通知
      const enabled = await this.isTypeEnabled(input.userId, input.type)
      if (!enabled) return

      const notification = this.notificationRepo.create({
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        link: input.link || null,
        isRead: false,
      })
      await this.notificationRepo.save(notification)
    } catch (err) {
      this.logger.error(`[Notify] Failed to create notification for ${input.userId}: ${err?.message || err}`)
    }
  }

  /**
   * 檢查用戶是否啟用某類通知（從用戶偏好欄位映射）
   */
  private async isTypeEnabled(userId: string, type: NotificationType): Promise<boolean> {
    const user = await this.userRepo.findOne({ where: { id: userId } })
    if (!user) return false

    switch (type) {
      // 拍賣事件
      case NotificationType.OUTBID:
        return user.outbidAlerts !== false // 默認開
      case NotificationType.AUCTION_ENDING:
        return user.auctionEnding !== false
      case NotificationType.AUCTION_RESULT:
        return user.auctionResult !== false
      case NotificationType.NEW_BID:
        return user.newBidAlerts !== false
      // 交易事件
      case NotificationType.ORDER_UPDATE:
        return user.orderUpdates !== false
      case NotificationType.PAYMENT_RECEIVED:
        return user.paymentReceivedAlerts !== false
      case NotificationType.RESERVATION_UPDATE:
        return user.reservationUpdates !== false
      default:
        return true
    }
  }

  /** 用戶通知列表（分頁） */
  async findByUser(userId: string, page = 1, limit = 20) {
    const [data, total] = await this.notificationRepo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    })
    const unread = await this.notificationRepo.count({ where: { userId, isRead: false } })
    return { data, total, unread, page, limit }
  }

  /** 未讀數量（鈴鐺紅點輪詢用） */
  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepo.count({ where: { userId, isRead: false } })
  }

  /** 標記單一通知已讀 */
  async markRead(userId: string, notificationId: string) {
    await this.notificationRepo.update(
      { id: notificationId, userId },
      { isRead: true }
    )
    return { success: true }
  }

  /** 全部標記已讀 */
  async markAllRead(userId: string) {
    await this.notificationRepo.update(
      { userId, isRead: false },
      { isRead: true }
    )
    return { success: true }
  }

  /** 清理 30 天前已讀通知 */
  async cleanupOld() {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const result = await this.notificationRepo
      .createQueryBuilder()
      .delete()
      .where('isRead = :isRead AND createdAt < :cutoff', { isRead: true, cutoff })
      .execute()
    return result
  }
}