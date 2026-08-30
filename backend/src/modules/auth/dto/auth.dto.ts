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

// 手機驗證碼登入/註冊
export class SendCodeDto {
  @IsString()
  regionCode: string  // e.g. '+853'

  @IsString()
  phone: string  // 不含區號，純號碼
}

export class PhoneLoginDto {
  @IsString()
  regionCode: string  // e.g. '+853'

  @IsString()
  phone: string  // 不含區號

  @IsString()
  @MinLength(4)
  @MaxLength(8)
  code: string  // 驗證碼

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  nickname?: string  // 新用戶可指定暱稱
}
