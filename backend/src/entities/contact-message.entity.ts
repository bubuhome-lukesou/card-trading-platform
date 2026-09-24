import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn
} from 'typeorm'

export enum ContactMessageStatus {
  NEW = 'new',
  READ = 'read',
  HANDLED = 'handled'
}

@Entity('contact_messages')
export class ContactMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'varchar', length: 100 })
  name: string

  @Column({ type: 'varchar', length: 200 })
  email: string

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone: string

  @Column({ type: 'varchar', length: 200 })
  subject: string

  @Column({ type: 'text' })
  message: string

  @Column({
    type: 'enum',
    enum: ContactMessageStatus,
    default: ContactMessageStatus.NEW
  })
  status: ContactMessageStatus

  // 登入用戶提交時記錄（未登入為 null）
  @Column({ type: 'varchar', length: 36, nullable: true })
  userId: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}