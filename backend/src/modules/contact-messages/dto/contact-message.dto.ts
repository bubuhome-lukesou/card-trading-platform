import { IsEmail, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'
import { ContactMessageStatus } from '../../../entities/contact-message.entity'

// 公開提交（未登入可用）
export class CreateContactMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string

  @IsEmail()
  @MaxLength(200)
  email: string

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  subject: string

  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  message: string
}

// admin 更新狀態
export class UpdateContactMessageDto {
  @IsEnum(ContactMessageStatus)
  status: ContactMessageStatus
}