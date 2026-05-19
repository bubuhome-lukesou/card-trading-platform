import { IsString, IsOptional, IsNumber, Min, IsEnum } from 'class-validator'
import { Transform } from 'class-transformer'
import { TagType } from '../../../entities/tag.entity'

export class CreateTagDto {
  @IsString()
  name: string

  @IsOptional()
  @IsString()
  slug?: string

  @IsOptional()
  @IsString()
  color?: string

  @IsOptional()
  @IsEnum(TagType)
  type?: TagType

  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number
}

export class UpdateTagDto {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsString()
  slug?: string

  @IsOptional()
  @IsString()
  color?: string

  @IsOptional()
  @IsEnum(TagType)
  type?: TagType

  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number
}
