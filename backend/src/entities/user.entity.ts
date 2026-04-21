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

  @Column({ unique: true })
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

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
