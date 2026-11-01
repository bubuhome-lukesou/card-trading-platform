import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn
} from 'typeorm'
import { Order } from './order.entity'
import { User } from './user.entity'

// 訂單聊天（2026-11-01）：每筆訂單一條 thread，買賣雙方對話
// 攞貨協調（揀時間/確認時間）以系統消息形式寫入，令聊天框可見流程進度
export enum OrderMessageKind {
  CHAT = 'chat',       // 普通文字/附件消息
  SYSTEM = 'system',   // 系統動作消息（提出時間/確認時間/完成取貨等）
  TIME_PROPOSAL = 'time_proposal', // 買家提出攞貨時間（附結構化數據）
}

@Entity('order_messages')
@Index(['orderId', 'createdAt'])
export class OrderMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Index()
  @Column({ type: 'varchar', length: 36 })
  orderId: string

  @ManyToOne(() => Order)
  @JoinColumn({ name: 'orderId' })
  order: Order

  // senderId = null 代表系統消息
  @Column({ type: 'varchar', length: 36, nullable: true })
  senderId: string | null

  @ManyToOne(() => User)
  @JoinColumn({ name: 'senderId' })
  sender: User

  @Column({ type: 'varchar', length: 16, default: 'chat' })
  kind: OrderMessageKind

  @Column({ type: 'text' })
  content: string

  // 附件（圖片/影片）— JSON 陣列字串：[{ url, type }]
  @Column({ type: 'text', nullable: true })
  attachments: string | null

  // time_proposal 消息附帶嘅結構化數據（ISO 時間串）
  @Column({ type: 'varchar', length: 50, nullable: true })
  proposalTime: string | null

  @CreateDateColumn()
  createdAt: Date
}