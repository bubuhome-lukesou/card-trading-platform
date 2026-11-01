import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn
} from 'typeorm'
import { User } from './user.entity'
import { Product } from './product.entity'

export enum OrderType {
  DIRECT_PURCHASE = 'direct_purchase',
  BUY_NOW = 'buy_now',
  AUCTION_WIN = 'auction_win',
  RESERVATION_DEPOSIT = 'reservation_deposit',
  RESERVATION_FULL = 'reservation_full'
}

export enum OrderStatus {
  PENDING = 'pending',
  PENDING_PAID = 'pending_paid',
  CONFIRMED = 'confirmed',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded'
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ unique: true })
  orderNumber: string

  @Column({ type: 'varchar', length: 36 })
  buyerId: string

  @ManyToOne(() => User)
  @JoinColumn({ name: 'buyerId' })
  buyer: User

  @Column({ type: 'varchar', length: 36 })
  sellerId: string

  @ManyToOne(() => User)
  @JoinColumn({ name: 'sellerId' })
  seller: User

  @Column({ type: 'varchar', length: 36 })
  productId: string

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'productId' })
  product: Product

  @Column({ type: 'enum', enum: OrderType, default: OrderType.DIRECT_PURCHASE })
  type: OrderType

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalPrice: number

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  shippingCost: number

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  platformFee: number

  @Column({ nullable: true })
  shippingAddress: string

  @Column({ nullable: true })
  trackingNumber: string

  @Column({ nullable: true })
  paymentMethod: string

  @Column({ nullable: true })
  paymentTime: Date

  @Column({ nullable: true })
  shippingTime: Date

  @Column({ nullable: true })
  deliveryTime: Date

  @Column({ nullable: true })
  notes: string

  @Column({ default: 1 })
  quantity: number

  @Column({ nullable: true })
  reservationId: string | null  // R4: link to reservation for deposit/balance orders

  @Column({ nullable: true })
  transferReceipt: string

  @Column({ nullable: true })
  transferTime: Date

  @Column({ nullable: true })
  balanceReceipt: string

  @Column({ nullable: true })
  balanceTime: Date

  // ===== 攞貨協調聊天流程（2026-11-01）=====
  // 買家提出嘅攞貨時間（ISO 串，pending/pending_paid 階段買家可改選重提）
  @Column({ name: 'pickupProposalTime', type: 'varchar', length: 50, nullable: true })
  pickupProposalTime: string | null

  // 商家確認時間後寫入；確認前買家可重新選時間
  @Column({ name: 'pickupTime', type: 'datetime', nullable: true })
  pickupTime: Date | null

  // 'none' | 'proposed' | 'confirmed' — 決定買家視角「待確認取貨」階段
  @Column({ name: 'pickupConfirmStatus', type: 'varchar', length: 20, default: 'none' })
  pickupConfirmStatus: string

  // 買家「確認取貨」時間 — 訂單完成節點
  @Column({ name: 'pickupConfirmedAt', type: 'datetime', nullable: true })
  pickupConfirmedAt: Date | null

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
