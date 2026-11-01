import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn
} from 'typeorm'
import { User } from './user.entity'
import { Order } from './order.entity'

// 互評系統（2026-11-01）：訂單完成（delivered）後買賣雙方互評
// - 買家評商家（seller_review）、商家評買家（buyer_review）
// - 5 星必選 + 文字（選填）+ 最多 9 張圖片
// - 雙方交評或對方已評後 7 天先公開對方評語（防互見報復）
export enum ReviewRole {
  SELLER_REVIEW = 'seller_review', // 買家寫，評商家
  BUYER_REVIEW = 'buyer_review',   // 商家寫，評買家
}

@Entity('reviews')
@Index(['orderId'])
@Index(['targetRole', 'targetUserId'])
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'varchar', length: 36 })
  orderId: string

  @ManyToOne(() => Order)
  @JoinColumn({ name: 'orderId' })
  order: Order

  @Index()
  @Column({ type: 'varchar', length: 36 })
  reviewerId: string

  @ManyToOne(() => User)
  @JoinColumn({ name: 'reviewerId' })
  reviewer: User

  // 被評方（冗餘存一份，方便列表查詢）
  @Index()
  @Column({ type: 'varchar', length: 36 })
  targetUserId: string

  // seller_review=評商家 / buyer_review=評買家
  @Column({ type: 'varchar', length: 20 })
  targetRole: ReviewRole

  @Column({ type: 'int' })
  rating: number // 1-5（必填）

  @Column({ type: 'text', nullable: true })
  content: string | null

  // JSON 陣列字串，最多 9 條 URL
  @Column({ type: 'text', nullable: true })
  images: string | null

  // 商家公開回覆（可空；評論展示頁用）
  @Column({ type: 'text', nullable: true })
  reply: string | null

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}