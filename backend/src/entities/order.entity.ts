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

  @Column({ type: 'enum', enum: OrderType, default: OrderType.DIRECT_PURCHASE })
  type: OrderType

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus

  @Column({ type: 'decimal', precision: 10, scale: 2 })
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

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
