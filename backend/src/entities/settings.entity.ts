import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn } from 'typeorm'

@Entity('settings')
export class Settings {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ type: 'text', nullable: true })
  pickupInfo: string  // 預約攞货地点、时间、WeChat二維碼等信息

  @Column({ nullable: true })
  pickupQrCode: string  // WeChat二维码图片URL

  @UpdateDateColumn()
  updatedAt: Date
}
