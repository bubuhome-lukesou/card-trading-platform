import { IsString, IsOptional, IsNumber, Min } from 'class-validator'
import { Transform } from 'class-transformer'

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
  @IsNumber()
  @Min(0)
  sortOrder?: number
}
