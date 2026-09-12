import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as bcrypt from 'bcrypt'
import { OAuth2Client } from 'google-auth-library'
import { User, UserRole, UserStatus } from '../../entities/user.entity'
import { LoginDto, RegisterDto, AuthResponseDto, PhoneLoginDto, GoogleLoginDto } from './dto/auth.dto'
import { SmsService } from '../sms/sms.service'

@Injectable()
export class AuthService {
  private googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly smsService: SmsService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const existingUser = await this.userRepo.findOne({
      where: [{ email: dto.email }, { nickname: dto.nickname }]
    })

    if (existingUser) {
      if (existingUser.email === dto.email) {
        throw new ConflictException('Email already registered')
      }
      throw new ConflictException('Nickname already taken')
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10)
    const user = this.userRepo.create({
      email: dto.email,
      nickname: dto.nickname,
      password: hashedPassword,
      role: dto.role as UserRole || UserRole.USER,
      status: UserStatus.ACTIVE
    })

    await this.userRepo.save(user)

    const token = this.generateToken(user)

    return {
      user: this.sanitizeUser(user),
      accessToken: token
    }
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.userRepo.findOne({
      where: { email: dto.email }
    })

    if (!user) {
      throw new UnauthorizedException('Invalid credentials')
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Account suspended')
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password)
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials')
    }

    user.lastLoginAt = new Date()
    await this.userRepo.save(user)

    const token = this.generateToken(user)

    return {
      user: this.sanitizeUser(user),
      accessToken: token
    }
  }

  async validateUser(id: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id } })
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User not found or suspended')
    }
    return user
  }

  // 發送手機驗證碼
  async sendPhoneCode(regionCode: string, phone: string): Promise<{ success: boolean; message: string }> {
    if (!this.smsService.validatePhone(regionCode, phone)) {
      throw new BadRequestException('手機號碼格式不正確')
    }
    const fullPhone = `${regionCode}${phone}`
    return this.smsService.sendVerificationCode(fullPhone)
  }

  // 手機驗證碼登入/註冊（自動註冊新用戶）
  async phoneLogin(dto: PhoneLoginDto): Promise<AuthResponseDto> {
    if (!this.smsService.validatePhone(dto.regionCode, dto.phone)) {
      throw new BadRequestException('手機號碼格式不正確')
    }

    const fullPhone = `${dto.regionCode}${dto.phone}`

    // 驗證驗證碼
    this.smsService.verifyCode(fullPhone, dto.code)

    // 查找用戶
    let user = await this.userRepo.findOne({ where: { phone: fullPhone } })

    if (!user) {
      // 新用戶自動註冊
      const nickname = dto.nickname || `用戶${dto.phone.slice(-4)}`
      // 確保暱稱唯一
      let uniqueNickname = nickname
      let suffix = 1
      while (await this.userRepo.findOne({ where: { nickname: uniqueNickname } })) {
        uniqueNickname = `${nickname}${suffix}`
        suffix++
      }

      // 手機註冊用戶：email 留空（nullable），不造假佔位 email
      // 日後可自行綁定真實郵箱
      user = this.userRepo.create({
        email: null,
        nickname: uniqueNickname,
        phone: fullPhone,
        password: await bcrypt.hash(Math.random().toString(36), 10),
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        emailVerified: false,  // 郵箱未綁定未驗證（手機驗證由驗證碼登入本身保證）
      })
      await this.userRepo.save(user)
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('帳號已停用')
    }

    user.lastLoginAt = new Date()
    await this.userRepo.save(user)

    const token = this.generateToken(user)
    return {
      user: this.sanitizeUser(user),
      accessToken: token,
    }
  }

  // Google OAuth 登入（驗證 ID token → 查/建帳號 → 發 JWT）
  // Google 帳號嘅 email 已由 Google 驗證，直接信任
  async googleLogin(dto: GoogleLoginDto): Promise<AuthResponseDto> {
    let payload: any
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: dto.credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      })
      payload = ticket.getPayload()
    } catch {
      throw new UnauthorizedException('Google 驗證失敗，請重試')
    }
    if (!payload?.sub || !payload.email) {
      throw new UnauthorizedException('Google 帳號資料不完整')
    }

    const googleId = payload.sub
    const email = payload.email.toLowerCase()
    const nickname = payload.name || email.split('@')[0]
    const picture = payload.picture || null

    // 1. 以 googleId 查找（已綁定過嘅老用戶）
    let user = await this.userRepo.findOne({ where: { googleId } })

    // 2. 以 email 查找（老 email 帳號首次用 Google 登入 → 自動綁定）
    if (!user) {
      user = await this.userRepo.findOne({ where: { email } })
      if (user) {
        user.googleId = googleId
        if (!user.emailVerified) user.emailVerified = true // Google email 已驗證
        await this.userRepo.save(user)
      }
    }

    // 3. 都冇 → 新帳號
    if (!user) {
      // 暱稱唯一化
      let uniqueNickname = nickname.slice(0, 18) || '用戶'
      let suffix = 1
      while (await this.userRepo.findOne({ where: { nickname: uniqueNickname } })) {
        uniqueNickname = `${nickname.slice(0, 16)}${suffix}`
        suffix++
      }

      user = this.userRepo.create({
        email, // Google email 已驗證，直接用（nullable email 架構下真實填入）
        googleId,
        nickname: uniqueNickname,
        avatar: picture,
        password: await bcrypt.hash(Math.random().toString(36), 10), // 隨機密碼，Google 登入用不到
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        emailVerified: true, // Google 已驗證
      })
      await this.userRepo.save(user)
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('帳號已停用')
    }

    user.lastLoginAt = new Date()
    await this.userRepo.save(user)

    const token = this.generateToken(user)
    return {
      user: this.sanitizeUser(user),
      accessToken: token,
    }
  }

  async getProfile(userId: string): Promise<User> {
    return this.validateUser(userId)
  }

  private generateToken(user: User): string {
    const payload = { sub: user.id, email: user.email || null, role: user.role }
    return this.jwtService.sign(payload)
  }

  private sanitizeUser(user: User) {
    const obj = { ...user }
    delete obj.password
    return obj
  }
}
