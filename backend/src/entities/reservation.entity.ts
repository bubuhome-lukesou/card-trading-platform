import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn
} from 'typeorm'
import { User } from './user.entity'
import { Product } from './product.entity'

export enum ReservationStatus {
  PENDING = 'pending',
  DEPOSIT_PAID = 'deposit_paid',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired'
}

@Entity('reservations')
export class Reservation {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  productId: string

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'productId' })
  product: Product

  @Column()
  buyerId: string

  @ManyToOne(() => User)
  @JoinColumn({ name: 'buyerId' })
  buyer: User

  @Column({ type: 'int', default: 1 })
  quantity: number

  @Column({ name: 'depositAmount', type: 'decimal', precision: 10, scale: 2 })
  depositAmount: number

  @Column({ name: 'depositPaidAt', type: 'datetime', nullable: true })
  depositPaidAt: Date | null

  @Column({ type: 'enum', enum: ReservationStatus, default: ReservationStatus.PENDING })
  status: ReservationStatus

  @Column({ name: 'expireTime', type: 'datetime' })
  expireTime: Date

  @CreateDateColumn()
  createdAt: Date
}