import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn, Index } from 'typeorm'

@Entity('banners')
@Index(['isActive', 'sortOrder'])
export class Banner {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ type: 'varchar', length: 255, nullable: true })
  title: string | null  // 內部備註（不對外顯示）

  @Column({ type: 'varchar', length: 500 })
  imageUrl: string  // 廣告圖片 URL

  @Column({ type: 'varchar', length: 500, nullable: true })
  linkUrl: string | null  // 點擊跳轉連結（空 = 純展示）

  @Column({ type: 'int', default: 0 })
  sortOrder: number  // 排序（越小越前）

  @Column({ type: 'boolean', default: true })
  isActive: boolean  // 啟用/停用

  @UpdateDateColumn()
  updatedAt: Date
}