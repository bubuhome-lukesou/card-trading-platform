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
  COMMON = 'common',
  RARE = 'rare',
  SUPER_RARE = 'super_rare',
  ULTRA_RARE = 'ultra_rare',
  SECRET_RARE = 'secret_rare'
}

export enum ProductCondition {
  MINT = 'mint',
  NEAR_MINT = 'near_mint',
  EXCELLENT = 'excellent',
  GOOD = 'good',
  FAIR = 'fair'
}

export enum ListingType {
  BOTH = 'both',
  SALE_ONLY = 'sale_only',
  AUCTION_ONLY = 'auction_only'
}

export enum ProductStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  SOLD = 'sold',
  ENDED = 'ended',
  CANCELLED = 'cancelled'
}

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
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

  @Column({ type: 'enum', enum: ProductRarity })
  rarity: ProductRarity

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

  @Column({ type: 'enum', enum: ProductStatus, default: ProductStatus.DRAFT })
  status: ProductStatus

  @Column({ default: 0 })
  viewCount: number

  @Column({ default: 0 })
  favoriteCount: number

  @Column({ type: 'int', default: 0 })
  stock: number

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
