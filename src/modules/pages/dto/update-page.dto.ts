import { IsEnum, IsOptional, IsString } from 'class-validator'
import { PageType } from '../../../entities/page.entity'

export class UpdatePageDto {
  @IsEnum(PageType)
  type: PageType

  @IsOptional()
  @IsString()
  titleZh?: string

  @IsOptional()
  @IsString()
  titleEn?: string

  @IsOptional()
  @IsString()
  contentZh?: string

  @IsOptional()
  @IsString()
  contentEn?: string
}
