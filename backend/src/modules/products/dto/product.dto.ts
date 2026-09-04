import { IsEnum, IsOptional, IsString, IsNumber, IsArray, Min, Max, IsUUID } from 'class-validator'
import { Transform, Type } from 'class-transformer'
import { ProductCategory, ProductRarity, ProductCondition, ListingType, ProductStatus, ProductType } from '../../../entities/product.entity'

export class ProductFiltersDto {
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') return value.split(',').map(s => s.trim()).filter(Boolean)
    if (Array.isArray(value)) return value.flatMap(v => typeof v === 'string' ? v.split(',').map(s => s.trim()) : v).filter(Boolean)
    return undefined
  })
  category?: string[]

  @IsOptional()
  brand?: string[]

  @IsOptional()
  series?: string[]

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') return value.split(',').map(s => s.trim()).filter(Boolean)
    if (Array.isArray(value)) return value.flatMap(v => typeof v === 'string' ? v.split(',').map(s => s.trim()) : v).filter(Boolean)
    return undefined
  })

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') return value.split(',').map(s => s.trim()).filter(Boolean)
    if (Array.isArray(value)) return value.flatMap(v => typeof v === 'string' ? v.split(',').map(s => s.trim()) : v).filter(Boolean)
    return undefined
  })
  condition?: ProductCondition[]

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  priceMin?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  priceMax?: number

  @IsOptional()
  @IsEnum(ListingType)
  listingType?: ListingType

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus

  @IsOptional()
  @IsString()
  search?: string

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20

  @IsOptional()
  @IsString()
  sortBy?: string = 'newest'

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') return value.split(',').map(s => s.trim()).filter(Boolean)
    if (Array.isArray(value)) return value.flatMap(v => typeof v === 'string' ? v.split(',').map(s => s.trim()) : v).filter(Boolean)
    return undefined
  })
  tags?: string[]

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') return value.split(',').map(s => s.trim()).filter(Boolean)
    if (Array.isArray(value)) return value.flatMap(v => typeof v === 'string' ? v.split(',').map(s => s.trim()) : v).filter(Boolean)
    return undefined
  })
  @IsString({ each: true })
  language?: string[]

  @IsOptional()
  @Type(() => Boolean)
  hideSold?: boolean
}

export class CreateProductDto {
  @IsEnum(ProductCategory)
  category: ProductCategory

  @IsOptional()
  @IsString()
  brand?: string

  @IsOptional()
  @IsString()
  series?: string

  @IsOptional()
  @IsEnum(ProductRarity)

  @IsEnum(ProductCondition)
  condition: ProductCondition

  @IsString()
  titleEn: string

  @IsString()
  titleZh: string

  @IsOptional()
  @IsString()
  descriptionEn?: string

  @IsOptional()
  @IsString()
  descriptionZh?: string

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price: number

  @IsOptional()
  images?: any

  @IsOptional()
  @IsString()
  thumbnail?: string

  @IsOptional()
  @IsString()

  @IsOptional()
  @IsEnum(ListingType)
  listingType?: ListingType

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  startingPrice?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  bidIncrement?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  stock?: number = 1

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantity?: number = 1

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  tags?: number[]

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') return value.split(',').map(s => s.trim()).filter(Boolean)
    if (Array.isArray(value)) return value.flatMap(v => typeof v === 'string' ? v.split(',').map(s => s.trim()) : v).filter(Boolean)
    return undefined
  })
  @IsOptional()
  @IsEnum(ProductType)
  productType?: ProductType

  @IsOptional()
  @IsString()
  language?: string  // ProductLanguage enum value: japanese, english, traditional_chinese, simplified_chinese, korean, other

  // Reservation fields
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  reservationMax?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  reservationDeposit?: number

  @IsOptional()
  @IsString()
  reservationDeadline?: string
}

export class UpdateProductDto {
  @IsOptional()
  @IsEnum(ProductCategory)
  category?: ProductCategory

  @IsOptional()
  @IsString()
  brand?: string

  @IsOptional()
  @IsString()
  series?: string

  @IsOptional()
  @IsEnum(ProductRarity)

  @IsOptional()
  @IsEnum(ProductCondition)
  condition?: ProductCondition

  @IsOptional()
  @IsString()
  titleEn?: string

  @IsOptional()
  @IsString()
  titleZh?: string

  @IsOptional()
  @IsString()
  descriptionEn?: string

  @IsOptional()
  @IsString()
  descriptionZh?: string

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price?: number

  @IsOptional()
  images?: any

  @IsOptional()
  @IsString()
  thumbnail?: string

  @IsOptional()
  @IsString()

  @IsOptional()
  @IsEnum(ListingType)
  listingType?: ListingType

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  startingPrice?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  bidIncrement?: number

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  stock?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantity?: number

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  tags?: number[]

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') return value.split(',').map(s => s.trim()).filter(Boolean)
    if (Array.isArray(value)) return value.flatMap(v => typeof v === 'string' ? v.split(',').map(s => s.trim()) : v).filter(Boolean)
    return undefined
  })
  @IsOptional()
  @IsEnum(ProductType)
  productType?: ProductType

  @IsOptional()
  @IsString()
  language?: string

  // Reservation fields
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  reservationMax?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  reservationDeposit?: number

  @IsOptional()
  @IsString()
  reservationDeadline?: string
}