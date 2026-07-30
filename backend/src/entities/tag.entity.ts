import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToMany, JoinTable } from 'typeorm'
import { Product } from './product.entity'

export enum TagType {
  GENERAL = 'general',         // 普通标签
  PRODUCT_TYPE = 'product_type', // 商品種類（評分卡/原箱/原盒/原袋/裸卡）
  LANGUAGE = 'language',        // 語言標籤（日文/英文/繁中/簡中）
}

@Entity('tags')
export class Tag {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ unique: true })
  name: string

  @Column({ nullable: true })
  slug: string

  @Column({ nullable: true })
  color: string

  @Column({ type: 'enum', enum: TagType, default: TagType.GENERAL })
  type: TagType

  @Column({ default: 1 })
  sortOrder: number

  @CreateDateColumn()
  createdAt: Date

  @ManyToMany(() => Product, product => product.tags)
  products: Product[]
}
