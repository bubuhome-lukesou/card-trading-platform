import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as bcrypt from 'bcrypt'
import { SellerApplication, SellerApplicationStatus } from '../../entities/seller-application.entity'
import { User, UserRole, UserStatus } from '../../entities/user.entity'

@Injectable()
export class SellerApplicationsService {
  constructor(
    @InjectRepository(SellerApplication)
    private applicationRepo: Repository<SellerApplication>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  // 提交商家入駐申請（帶帳號資料）
  async createWithAccount(dto: {
    email: string
    nickname: string
    password: string
    storeName: string
    storeDescription?: string
    phone?: string
    pickupInfo?: string
    pickupQrCode?: string
  }): Promise<SellerApplication> {
    // 檢查電郵是否已被使用
    const existingEmail = await this.userRepo.findOne({ where: { email: dto.email } })
    if (existingEmail) {
      throw new ConflictException('此電郵已被註冊')
    }

    // 檢查暱稱是否已被使用
    const existingNickname = await this.userRepo.findOne({ where: { nickname: dto.nickname } })
    if (existingNickname) {
      throw new ConflictException('此暱稱已被使用')
    }

    // 檢查是否已有待審批的申請（用電郵查）
    const existingApp = await this.applicationRepo.findOne({
      where: { email: dto.email, status: SellerApplicationStatus.PENDING }
    })
    if (existingApp) {
      throw new ConflictException('此電郵已有待審批的申請')
    }

    // 加密密碼
    const hashedPassword = await bcrypt.hash(dto.password, 10)

    const application = this.applicationRepo.create({
      email: dto.email,
      nickname: dto.nickname,
      password: hashedPassword,
      storeName: dto.storeName,
      storeDescription: dto.storeDescription,
      phone: dto.phone,
      pickupInfo: dto.pickupInfo,
      pickupQrCode: dto.pickupQrCode,
      status: SellerApplicationStatus.PENDING,
    })
    return this.applicationRepo.save(application)
  }

  // 根據電郵查詢申請狀態
  async getByEmail(email: string): Promise<SellerApplication | null> {
    return this.applicationRepo.findOne({
      where: { email },
      order: { createdAt: 'DESC' }
    })
  }

  // 管理員：獲取所有待審批申請
  async getPendingApplications(): Promise<SellerApplication[]> {
    return this.applicationRepo.find({
      where: { status: SellerApplicationStatus.PENDING },
      order: { createdAt: 'ASC' }
    })
  }

  // 管理員：獲取所有申請（分頁）
  async getAllApplications(page = 1, limit = 20): Promise<{ data: SellerApplication[]; total: number }> {
    const [data, total] = await this.applicationRepo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    })
    return { data, total }
  }

  // 管理員：審批通過 — 創建商家帳號
  async approve(applicationId: string): Promise<SellerApplication> {
    const application = await this.applicationRepo.findOne({
      where: { id: applicationId }
    })
    if (!application) {
      throw new NotFoundException('申請不存在')
    }
    if (application.status !== SellerApplicationStatus.PENDING) {
      throw new ConflictException('該申請已被審批')
    }

    // 創建商家帳號
    const user = this.userRepo.create({
      email: application.email,
      nickname: application.nickname,
      password: application.password, // 已是加密密碼
      role: UserRole.SELLER,
      status: UserStatus.ACTIVE,
      pickupInfo: application.pickupInfo,
      pickupQrCode: application.pickupQrCode,
    })
    await this.userRepo.save(user)

    // 更新申請狀態
    application.status = SellerApplicationStatus.APPROVED
    application.reviewedAt = new Date()
    application.userId = user.id

    return this.applicationRepo.save(application)
  }

  // 管理員：審批拒絕
  async reject(applicationId: string, reason?: string): Promise<SellerApplication> {
    const application = await this.applicationRepo.findOne({ where: { id: applicationId } })
    if (!application) {
      throw new NotFoundException('申請不存在')
    }
    if (application.status !== SellerApplicationStatus.PENDING) {
      throw new ConflictException('該申請已被審批')
    }

    application.status = SellerApplicationStatus.REJECTED
    application.reviewedAt = new Date()
    application.rejectionReason = reason

    return this.applicationRepo.save(application)
  }
}
