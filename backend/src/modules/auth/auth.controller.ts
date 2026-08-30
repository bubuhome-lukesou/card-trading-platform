import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common'
import { AuthService } from './auth.service'
import { LoginDto, RegisterDto, SendCodeDto, PhoneLoginDto } from './dto/auth.dto'
import { JwtAuthGuard } from './guards/jwt-auth.guard'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto)
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto)
  }

  // 發送手機驗證碼
  @Post('send-code')
  async sendCode(@Body() dto: SendCodeDto) {
    return this.authService.sendPhoneCode(dto.regionCode, dto.phone)
  }

  // 手機驗證碼登入/註冊
  @Post('phone-login')
  async phoneLogin(@Body() dto: PhoneLoginDto) {
    return this.authService.phoneLogin(dto)
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Request() req) {
    return this.authService.getProfile(req.user.id)
  }
}
