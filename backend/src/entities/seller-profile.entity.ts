import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn
} from 'typeorm'

// 商家介紹頁 profile — 1:1 對應 users 表（userId 為 PK）
// 公開展示欄位：logo/banner/簡介/營業時間/WeChat QR/所在地區
// verified 由 admin 管理（本版僅保留欄位，admin UI 後續再加）
@Entity('seller_profiles')
export class SellerProfile {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  userId: string

  // 店鋪 logo（圖片 URL；空時公開頁 fallback 用 user.avatar → 暱稱首字）
  @Column({ type: 'varchar', length: 500, nullable: true })
  logo: string | null

  // 店鋪封面橫幅（圖片 URL）
  @Column({ type: 'varchar', length: 500, nullable: true })
  banner: string | null

  // 商家簡介（繁中，公開頁主視語言）
  @Column({ type: 'text', nullable: true })
  descriptionZh: string | null

  // 商家簡介（英文）
  @Column({ type: 'text', nullable: true })
  descriptionEn: string | null

  // 營業時間（自由文字，例：週一至週五 14:00-20:00；週六日 12:00-18:00）
  @Column({ type: 'varchar', length: 1000, nullable: true })
  businessHours: string | null

  // 微信號
  @Column({ type: 'varchar', length: 100, nullable: true })
  wechatId: string | null

  // WeChat QR code 圖片 URL（點擊放大長按識別）
  @Column({ type: 'varchar', length: 500, nullable: true })
  wechatQrCode: string | null

  // 所在地區（例：澳門 / 香港 / 廣東）
  @Column({ type: 'varchar', length: 200, nullable: true })
  location: string | null

  // 認證商家標記（admin 管理）
  @Column({ type: 'boolean', default: false })
  verified: boolean

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}