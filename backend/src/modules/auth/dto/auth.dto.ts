import { IsEmail, IsString, MinLength, MaxLength, IsOptional, IsEnum } from 'class-validator'

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

export class AuthResponseDto {
  user: any
  accessToken: string
}
