import { IsNumber, Min, IsOptional, IsDateString, IsUUID, IsArray, IsString, IsEnum } from 'class-validator'
import { Type } from 'class-transformer'
import { AuctionStatus } from '../../../entities/auction.entity'
import { ProductRarity } from '../../../entities/product.entity'

export class AuctionFiltersDto {
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
  rarity?: ProductRarity[]

  @IsOptional()
  @IsEnum(AuctionStatus)
  status?: AuctionStatus

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  priceMin?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  priceMax?: number

  @IsOptional()
  @IsString()
  search?: string

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 20

  @IsOptional()
  @IsString()
  sortBy?: string = 'endingSoon'
}

export class CreateAuctionDto {
  @IsUUID()
  productId: string

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  startingPrice: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  reservePrice?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  buyNowPrice?: number

  @IsDateString()
  startTime: string

  @IsDateString()
  endTime: string

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  extensionMinutes?: number = 5
}

export class PlaceBidDto {
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  amount: number
}
