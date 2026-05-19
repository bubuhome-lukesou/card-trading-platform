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

export enum SellerApplicationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

@Entity('seller_applications')
export class SellerApplication {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ nullable: true })
  userId: string

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User

  // 帳號資料（申請時填寫，審批通過後創建 User 帳號）
  @Column({ unique: true })
  email: string

  @Column()
  nickname: string

  @Column()
  password: string  // 加密後的密碼

  // 商店資料
  @Column()
  storeName: string

  @Column({ type: 'text', nullable: true })
  storeDescription: string

  @Column({ nullable: true })
  phone: string

  // 取貨資訊
  @Column({ type: 'text', nullable: true })
  pickupInfo: string

  @Column({ nullable: true })
  pickupQrCode: string

  @Column({ type: 'enum', enum: SellerApplicationStatus, default: SellerApplicationStatus.PENDING })
  status: SellerApplicationStatus

  @Column({ nullable: true })
  reviewedBy: string

  @Column({ nullable: true })
  reviewedAt: Date

  @Column({ type: 'text', nullable: true })
  rejectionReason: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
