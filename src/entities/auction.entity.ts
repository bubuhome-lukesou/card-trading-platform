import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  OneToOne
} from 'typeorm'
import { User } from './user.entity'
import { Product } from './product.entity'
import { Bid } from './bid.entity'

export enum AuctionStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  ENDED = 'ended',
  CANCELLED = 'cancelled'
}

@Entity('auctions')
export class Auction {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  productId: string

  @ManyToOne(() => Product, product => product.auctions)
  @JoinColumn({ name: 'productId' })
  product: Product

  @Column()
  sellerId: string

  @ManyToOne(() => User)
  @JoinColumn({ name: 'sellerId' })
  seller: User

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  startingPrice: number

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  currentPrice: number

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  reservePrice: number

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  buyNowPrice: number

  @Column()
  startTime: Date

  @Column()
  endTime: Date

  @Column({ default: 5 })
  extensionMinutes: number

  @Column({ type: 'enum', enum: AuctionStatus, default: AuctionStatus.PENDING })
  status: AuctionStatus

  @Column({ default: 0 })
  bidCount: number

  @Column({ nullable: true })
  winnerId: string

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'winnerId' })
  winner: User

  @OneToMany(() => Bid, bid => bid.auction)
  bids: Bid[]

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}

// Re-export Bid so modules importing from auction.entity can get it
export { Bid } from './bid.entity'
