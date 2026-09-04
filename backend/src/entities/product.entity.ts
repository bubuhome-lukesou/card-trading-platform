import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinColumn,
  JoinTable
} from 'typeorm'
import { User } from './user.entity'
import { Auction } from './auction.entity'
import { Tag } from './tag.entity'

export enum ProductCategory {
  POKEMON = 'pokemon',
  YUGIOH = 'yugioh',
  MTG = 'mtg',
  ULTRAMAN = 'ultraman',
  ONEPiece = 'onepiece',
  DORAEMON = 'doraemon',
  SPORTS = 'sports',
  OTHER = 'other'
}

export enum ProductRarity {
  // 已棄用，請使用 Tag (type=product_type) 來標記商品種類
  // 保留欄位僅為向後相容
  COMMON = 'common',
  RARE = 'rare',
  SUPER_RARE = 'super_rare',
  ULTRA_RARE = 'ultra_rare',
  SECRET_RARE='***'
}

export enum ProductCondition {
  S = 'S',    // S級 - 完美品相
  A = 'A',    // A級 - 輕微瑕疵
  B = 'B',    // B級 - 少量瑕疵
  C = 'C',    // C級 - 磨損可見
  D = 'D'     // D級 - 嚴重磨損
}

export enum ListingType {
  BOTH = 'both',
  SALE_ONLY = 'sale_only',
  AUCTION_ONLY = 'auction_only',
  RESERVATION_ONLY = 'reservation_only'
}

export enum ProductStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  SOLD = 'sold',
  ENDED = 'ended',
  CANCELLED = 'cancelled',
  REMOVED = 'removed'
}

// 語言 enum（獨立管理，不依賴 Tag）
export enum ProductLanguage {
  JAPANESE = 'japanese',   // 日文
  ENGLISH = 'english',     // 英文
  TRADITIONAL_CHINESE = 'traditional_chinese', // 繁體中文
  SIMPLIFIED_CHINESE = 'simplified_chinese',   // 簡體中文
  KOREAN = 'korean',       // 韓文
  OTHER = 'other',         // 其他
}

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'varchar', length: 36 })
  sellerId: string

  @ManyToOne(() => User)
  @JoinColumn({ name: 'sellerId' })
  seller: User

  @Column({ type: 'enum', enum: ProductCategory })
  category: ProductCategory

  @Column({ nullable: true })
  brand: string

  @Column({ nullable: true })
  series: string

  @Column({ nullable: true })
  rarity: string

  // 商品種類（直接存標籤名稱，如「評分卡」「原箱」）
  @Column({ nullable: true })
  productType: string | null

  // 語言（enum ProductLanguage）
  @Column({ type: 'enum', enum: ProductLanguage, nullable: true })
  language: ProductLanguage | null

  @Column({ type: 'enum', enum: ProductCondition })
  condition: ProductCondition

  @Column()
  titleEn: string

  @Column()
  titleZh: string

  @Column({ type: 'text', nullable: true })
  descriptionEn: string

  @Column({ type: 'text', nullable: true })
  descriptionZh: string

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number

  @Column({ type: 'text', nullable: true })
  images: string

  @Column({ nullable: true })
  thumbnail: string

  @Column({ nullable: true })
  cardNumber: string

  @Column({ type: 'enum', enum: ListingType })
  listingType: ListingType

  @Column({ name: 'reservationMax', type: 'int', nullable: true })
  reservationMax: number | null

  @Column({ name: 'reservationLimitPerUser', type: 'int', nullable: true })
  reservationLimitPerUser: number | null

  @Column({ name: 'reservationDeposit', type: 'decimal', precision: 10, scale: 2, nullable: true })
  reservationDeposit: number | null

  @Column({ name: 'reservationDeadline', type: 'datetime', nullable: true })
  reservationDeadline: Date | null

  @Column({ type: 'enum', enum: ProductStatus, default: ProductStatus.DRAFT })
  status: ProductStatus

  @Column({ type: 'boolean', default: true })
  isActive: boolean

  @Column({ default: 0 })
  viewCount: number

  @Column({ default: 0 })
  favoriteCount: number

  @Column({ type: 'int', default: 0 })
  stock: number

  @Column({ type: 'int', nullable: true, default: 1 })
  quantity: number

  @OneToMany(() => Auction, auction => auction.product)
  auctions: Auction[]

  @ManyToMany(() => Tag, tag => tag.products)
  @JoinTable({
    name: 'product_tags',
    joinColumn: { name: 'productId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'tagId', referencedColumnName: 'id' }
  })
  tags: Tag[]

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
