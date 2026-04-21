import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as bcrypt from 'bcrypt'
import { User, UserRole, UserStatus } from '../../entities/user.entity'
import { LoginDto, RegisterDto, AuthResponseDto } from './dto/auth.dto'

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService
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
