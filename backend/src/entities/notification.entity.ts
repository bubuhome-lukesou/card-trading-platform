import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm'

// 通知類型 — 對應用戶通知偏好設置的事件分組
export enum NotificationType {
  // 拍賣通知
  OUTBID = 'outbid',                 // 被出局（有人出更高價）
  AUCTION_ENDING = 'auction_ending', // 參與的拍賣即將結束（最後 10 分鐘）
  AUCTION_RESULT = 'auction_result', // 拍賣結果（中標/未中標/流標）
  NEW_BID = 'new_bid',               // 賣家：拍賣收到新出價
  // 交易通知
  ORDER_UPDATE = 'order_update',     // 訂單狀態更新
  PAYMENT_RECEIVED = 'payment_received', // 賣家：買家上傳付款憑證
  RESERVATION_UPDATE = 'reservation_update', // 預約狀態更新（新預約/確認/到期）
}

@Entity('notifications')
@Index(['userId', 'createdAt'])
export class AppNotification {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Index()
  @Column({ type: 'varchar', length: 36 })
  userId: string

  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType

  @Column({ type: 'varchar', length: 200 })
  title: string

  @Column({ type: 'varchar', length: 500 })
  message: string

  // 點擊跳轉路徑，如 /auction/:id、/user/orders
  @Column({ type: 'varchar', length: 255, nullable: true })
  link: string

  @Column({ type: 'boolean', default: false })
  @Index()
  isRead: boolean

  @CreateDateColumn()
  createdAt: Date
}