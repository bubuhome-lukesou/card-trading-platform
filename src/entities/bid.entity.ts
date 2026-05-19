import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Auction } from './auction.entity';
import { User } from './user.entity';

export enum BidStatus {
  ACTIVE = 'active',
  WON = 'won',
  OUTBID = 'outbid',
  CANCELLED = 'cancelled',
}

@Entity('bids')
export class Bid {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  auctionId: string;

  @ManyToOne(() => Auction, auction => auction.bids)
  @JoinColumn({ name: 'auctionId' })
  auction: Auction;

  @Column({ type: 'uuid' })
  bidderId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'bidderId' })
  bidder: User;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'enum', enum: BidStatus, default: BidStatus.ACTIVE })
  status: BidStatus;

  @CreateDateColumn()
  createdAt: Date;
}
