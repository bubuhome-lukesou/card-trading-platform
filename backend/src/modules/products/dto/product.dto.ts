import { IsEnum, IsOptional, IsString, IsNumber, IsArray, Min, Max, IsUUID } from 'class-validator'
import { Transform, Type } from 'class-transformer'
import { ProductCategory, ProductRarity, ProductCondition, ListingType, ProductStatus } from '../../../entities/product.entity'

export class ProductFiltersDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  category?: string[]

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  brand?: string[]

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  series?: string[]

  @IsOptional()
  @IsArray()
  @IsEnum(ProductRarity, { each: true })
  rarity?: ProductRarity[]

  @IsOptional()
  @IsArray()
  @IsEnum(ProductCondition, { each: true })
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

  @IsEnum(ProductRarity)
  rarity: ProductRarity

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
  cardNumber?: string

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
  rarity?: ProductRarity

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
  cardNumber?: string

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
}
