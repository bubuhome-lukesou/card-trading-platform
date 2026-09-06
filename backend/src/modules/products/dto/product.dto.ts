import { IsEnum, IsOptional, IsString, IsNumber, IsArray, Min, Max, IsUUID, IsDateString, MaxLength } from 'class-validator'
import { Transform, Type } from 'class-transformer'
import { ProductCategory, ProductCondition, ListingType, ProductStatus, ProductType } from '../../../entities/product.entity'

// DB constraints: decimal(10,2) → max 99999999.99; int → max 2147483647
const MAX_PRICE = 99999999.99
const MAX_INT = 2147483647

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
  @MaxLength(255)
  brand?: string

  @IsOptional()
  @IsString()
  @MaxLength(255)
  series?: string

  @IsOptional()
  @IsEnum(ProductCondition)
  condition?: ProductCondition

  @IsString()
  @MaxLength(255)
  titleEn: string

  @IsString()
  @MaxLength(255)
  titleZh: string

  @IsOptional()
  @IsString()
  descriptionEn?: string

  @IsOptional()
  @IsString()
  descriptionZh?: string

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  @Max(MAX_PRICE)
  price: number

  @IsOptional()
  images?: any

  @IsOptional()
  @IsString()
  @MaxLength(255)
  thumbnail?: string

  @IsOptional()
  @IsEnum(ListingType)
  listingType?: ListingType

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(MAX_PRICE)
  startingPrice?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(MAX_PRICE)
  bidIncrement?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(MAX_INT)
  stock?: number = 1

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(MAX_INT)
  quantity?: number = 1

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  tags?: number[]

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean

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
  @Max(MAX_INT)
  reservationMax?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(MAX_PRICE)
  reservationDeposit?: number

  @IsOptional()
  @IsDateString()
  reservationDeadline?: string

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(MAX_INT)
  reservationLimitPerUser?: number
}

export class UpdateProductDto {
  @IsOptional()
  @IsEnum(ProductCategory)
  category?: ProductCategory

  @IsOptional()
  @IsString()
  @MaxLength(255)
  brand?: string

  @IsOptional()
  @IsString()
  @MaxLength(255)
  series?: string

  @IsOptional()
  @IsEnum(ProductCondition)
  condition?: ProductCondition

  @IsOptional()
  @IsString()
  @MaxLength(255)
  titleEn?: string

  @IsOptional()
  @IsString()
  @MaxLength(255)
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
  @Min(0.01)
  @Max(MAX_PRICE)
  price?: number

  @IsOptional()
  images?: any

  @IsOptional()
  @IsString()
  @MaxLength(255)
  thumbnail?: string

  @IsOptional()
  @IsEnum(ListingType)
  listingType?: ListingType

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(MAX_PRICE)
  startingPrice?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(MAX_PRICE)
  bidIncrement?: number

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(MAX_INT)
  stock?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(MAX_INT)
  quantity?: number

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  tags?: number[]

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
  @Max(MAX_INT)
  reservationMax?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(MAX_PRICE)
  reservationDeposit?: number

  @IsOptional()
  @IsDateString()
  reservationDeadline?: string

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(MAX_INT)
  reservationLimitPerUser?: number
}