import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as bcrypt from 'bcrypt'
import { User, UserRole, UserStatus } from '../../entities/user.entity'
import { LoginDto, RegisterDto, AuthResponseDto, PhoneLoginDto } from './dto/auth.dto'
import { SmsService } from '../sms/sms.service'

@Injectable()
export class AuthService {
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

      // 生成唯一 email（手機用戶不需要真實 email）
      const fakeEmail = `phone_${fullPhone.replace('+', '')}@phone.card`

      user = this.userRepo.create({
        email: fakeEmail,
        nickname: uniqueNickname,
        phone: fullPhone,
        password: await bcrypt.hash(Math.random().toString(36), 10),
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        emailVerified: true,  // 手機已驗證
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
    const payload = { sub: user.id, email: user.email, role: user.role }
    return this.jwtService.sign(payload)
  }

  private sanitizeUser(user: User) {
    const obj = { ...user }
    delete obj.password
    return obj
  }
}
