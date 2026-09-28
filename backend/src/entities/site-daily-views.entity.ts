import { Entity, PrimaryGeneratedColumn, Column, Index, UpdateDateColumn } from 'typeorm'

/**
 * 全站每日瀏覽數統計（每日一行）
 * 口徑：商品詳情頁瀏覽（GET /products/:id 時 viewCount+1 同步累計）
 * 用途：首頁統計條「本日瀏覽數 / 總瀏覽數」（liveStats）
 */
@Entity('site_daily_views')
@Index(['date'], { unique: true })
export class SiteDailyViews {
  @PrimaryGeneratedColumn()
  id: number

  // 日期字串（UTC+8 口徑：YYYY-MM-DD）
  @Column({ type: 'varchar', length: 10, unique: true })
  date: string

  @Column({ default: 0 })
  views: number

  @UpdateDateColumn()
  updatedAt: Date
}