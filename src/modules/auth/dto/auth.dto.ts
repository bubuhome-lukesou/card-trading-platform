import { IsEmail, IsString, MinLength, MaxLength, IsOptional, IsEnum, IsObject } from 'class-validator'

export class LoginDto {
  @IsEmail()
  email: string

  @IsString()
  @MinLength(6)
  password: string
}

export class RegisterDto {
  @IsEmail()
  email: string

  @IsString()
  @MinLength(3)
  @MaxLength(20)
  nickname: string

  @IsString()
  @MinLength(6)
  password: string

  @IsOptional()
  @IsEnum(['user', 'seller'])
  role?: string
}

// 商家入駐註冊：帳號資料 + 商店資料，一次完成
export class SellerRegisterDto {
  @IsEmail()
  email: string

  @IsString()
  @MinLength(3)
  @MaxLength(20)
  nickname: string

  @IsString()
  @MinLength(6)
  password: string

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  storeName: string

  @IsOptional()
  @IsString()
  @MaxLength(200)
  storeDescription?: string

  @IsOptional()
  @IsString()
  phone?: string

  @IsOptional()
  @IsString()
  pickupInfo?: string

  @IsOptional()
  @IsString()
  pickupQrCode?: string
}

export class AuthResponseDto {
  user: any
  accessToken: string
}
