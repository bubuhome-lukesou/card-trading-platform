import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToMany,
  JoinTable
} from 'typeorm'
import { Exclude } from 'class-transformer'

export enum UserRole {
  USER = 'user',
  SELLER = 'seller',
  ADMIN = 'admin'
}

export enum UserStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended'
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string

  // nullable：手機驗證碼註冊的用戶可能未綁定郵箱（對齊主流平台做法）
  @Column({ unique: true, nullable: true })
  email: string

  @Column({ unique: true })
  nickname: string

  @Column({ nullable: true })
  avatar: string

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE })
  status: UserStatus

  @Column()
  @Exclude()
  password: string

  @Column({ nullable: true })
  phone: string

  // 手機號唯一索引（phoneLogin 以此查找用戶，防止同一號碼多帳號）
  // 透過 DB 遷移加 unique index，entity 層加索引定義
  // （unique: true 會在 synchronize 模式自動建立；生產環境靠手動遷移）

  // Google OAuth 登入標識（Google 帳號唯一 ID）
  @Column({ nullable: true, unique: true })
  googleId: string

  @Column({ nullable: true })
  @Exclude()
  emailVerificationToken: string

  @Column({ default: false })
  emailVerified: boolean

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  balance: number

  @Column({ nullable: true })
  @Exclude()
  resetPasswordToken: string

  @Column({ nullable: true })
  resetPasswordExpires: Date

  @Column({ nullable: true })
  lastLoginAt: Date

  // 通知設置（舊渠道欄位 — 保留相容，UI 已改為事件分組）
  @Column({ type: 'boolean', default: true })
  emailNotifications: boolean

  @Column({ type: 'boolean', default: true })
  wechatNotifications: boolean

  @Column({ type: 'boolean', default: true })
  bidUpdates: boolean

  @Column({ type: 'boolean', default: true })
  outbidAlerts: boolean

  @Column({ type: 'boolean', default: true })
  auctionEnding: boolean

  // 通知設置（新 — 事件分組，純站內通知）
  @Column({ type: 'boolean', default: true })
  auctionResult: boolean

  @Column({ type: 'boolean', default: true })
  newBidAlerts: boolean

  @Column({ type: 'boolean', default: true })
  orderUpdates: boolean

  @Column({ type: 'boolean', default: true })
  paymentReceivedAlerts: boolean

  @Column({ type: 'boolean', default: true })
  reservationUpdates: boolean

  // 賣家取貨資訊
  @Column({ type: 'varchar', length: 2000, nullable: true })
  pickupInfo: string

  @Column({ nullable: true })
  pickupQrCode: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
