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
  PURCHASE = 'purchase',
  AUCTION_WIN = 'auction_win'
}

export enum OrderStatus {
  PENDING = 'pending',
  PAID = 'paid',
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

  @Column()
  buyerId: string

  @ManyToOne(() => User)
  @JoinColumn({ name: 'buyerId' })
  buyer: User

  @Column()
  sellerId: string

  @ManyToOne(() => User)
  @JoinColumn({ name: 'sellerId' })
  seller: User

  @Column()
  productId: string

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'productId' })
  product: Product

  @Column({ type: 'enum', enum: OrderType })
  type: OrderType

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  shippingFee: number

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  platformFee: number

  @Column({ nullable: true })
  auctionId: string

  @Column({ nullable: true })
  shippingAddress: string

  @Column({ nullable: true })
  trackingNumber: string

  @Column({ nullable: true })
  paidAt: Date

  @Column({ nullable: true })
  shippedAt: Date

  @Column({ nullable: true })
  deliveredAt: Date

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
