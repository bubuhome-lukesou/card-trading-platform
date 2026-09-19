import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn } from 'typeorm'

/**
 * 首頁 Hero + 統計條可編輯內容（id=1 單行，管理員後台編輯）
 * 所有欄位 nullable — 讀取時 fallback 前端 i18n 預設值
 */
@Entity('home_settings')
export class HomeSettings {
  @PrimaryGeneratedColumn()
  id: number

  // ===== Hero 區塊 =====
  @Column({ type: 'varchar', length: 200, nullable: true })
  heroTitleZh: string | null    // 預設：珍稀卡牌 限時競拍

  @Column({ type: 'varchar', length: 200, nullable: true })
  heroTitleEn: string | null

  @Column({ type: 'varchar', length: 300, nullable: true })
  heroSubtitleZh: string | null // 預設：發現最珍貴的收藏卡牌，參與激動人心的即時競拍

  @Column({ type: 'varchar', length: 300, nullable: true })
  heroSubtitleEn: string | null

  @Column({ type: 'varchar', length: 60, nullable: true })
  heroPrimaryBtnZh: string | null   // 預設：立即競拍

  @Column({ type: 'varchar', length: 60, nullable: true })
  heroPrimaryBtnEn: string | null

  @Column({ type: 'varchar', length: 500, nullable: true })
  heroPrimaryLink: string | null    // 預設 /auctions

  @Column({ type: 'varchar', length: 60, nullable: true })
  heroSecondaryBtnZh: string | null // 預設：瀏覽商品

  @Column({ type: 'varchar', length: 60, nullable: true })
  heroSecondaryBtnEn: string | null

  @Column({ type: 'varchar', length: 500, nullable: true })
  heroSecondaryLink: string | null  // 預設 /marketplace

  // ===== 統計條（JSON：[{value,labelZh,labelEn},...]，最多 6 項）=====
  @Column({ type: 'text', nullable: true })
  statsJson: string | null

  @UpdateDateColumn()
  updatedAt: Date
}