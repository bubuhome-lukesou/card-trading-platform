import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { SellerProfile } from '../../entities/seller-profile.entity'
import { User } from '../../entities/user.entity'

// 商家介紹頁 profile 服務
// - 公開端點只回 role=seller 嘅用戶 + 白名單欄位（防洩露 email/phone/password）
// - 賣家自改自己嘅 profile；首次保存自動建行（upsert 慣例）
const PUBLIC_USER_FIELDS = [
  'user.id',
  'user.nickname',
  'user.avatar',
  'user.createdAt'
]

export interface UpdateSellerProfileDto {
  logo?: string
  banner?: string
  descriptionZh?: string
  descriptionEn?: string
  businessHours?: string
  wechatId?: string
  wechatQrCode?: string
  location?: string
}

@Injectable()
export class SellerProfilesService {
  constructor(
    @InjectRepository(SellerProfile)
    private profileRepo: Repository<SellerProfile>,
    @InjectRepository(User)
    private userRepo: Repository<User>
  ) {}

  // 公開：商家介紹頁數據（user 基本資料 + profile + 商品統計）
  async getPublicProfile(sellerId: string) {
    const user = await this.userRepo
      .createQueryBuilder('user')
      .select(PUBLIC_USER_FIELDS)
      .where('user.id = :id', { id: sellerId })
      .andWhere('user.role = :role', { role: 'seller' })
      .getOne()

    if (!user) throw new NotFoundException('Seller not found')

    const profile = await this.profileRepo.findOne({ where: { userId: sellerId } })

    // 商品統計：在售（active，唔計 removed/sold）/ 拍賣中 / 預訂中
    // 排序口徑：加總三項做 header 徽章同 marketplace 口徑一致（active 全計，唔分 listingType）
    const statsRows = await this.userRepo.query(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN listingType = 'auction' THEN 1 ELSE 0 END) AS auction,
         SUM(CASE WHEN listingType = 'reservation' THEN 1 ELSE 0 END) AS reservation,
         SUM(CASE WHEN listingType = 'sale' THEN 1 ELSE 0 END) AS sale
       FROM products
       WHERE sellerId = ? AND status = 'active'`,
      [sellerId]
    )
    const raw = (statsRows && statsRows[0]) || {}
    const num = (v: unknown) => (v === null || v === undefined ? 0 : Number(v))
    const stats = {
      total: num(raw.total),
      auction: num(raw.auction),
      reservation: num(raw.reservation),
      sale: num(raw.sale)
    }

    return {
      user,
      profile: profile || null,
      stats
    }
  }

  // 賣家自己嘅 profile（冇就回 null 行，前端表單照開）
  async getMyProfile(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } })
    if (!user) throw new NotFoundException('User not found')
    if (user.role !== 'seller') throw new ForbiddenException('只有商家可以管理商家資料')

    let profile = await this.profileRepo.findOne({ where: { userId } })
    if (!profile) {
      // 首次進入未建行 — 回虛擬空 profile，唔好提前 INSERT（避免 admin 未預備嘅空行堆積）
      profile = this.profileRepo.create({ userId }) as SellerProfile
    }
    return { profile }
  }

  // 賣家更新自己 profile（upsert：冇行就建）
  async updateMyProfile(userId: string, dto: UpdateSellerProfileDto) {
    const user = await this.userRepo.findOne({ where: { id: userId } })
    if (!user) throw new NotFoundException('User not found')
    if (user.role !== 'seller') throw new ForbiddenException('只有商家可以管理商家資料')

    let profile = await this.profileRepo.findOne({ where: { userId } })
    if (!profile) {
      profile = this.profileRepo.create({ userId })
    }

    const allowed: (keyof SellerProfile)[] = [
      'logo', 'banner', 'descriptionZh', 'descriptionEn',
      'businessHours', 'wechatId', 'wechatQrCode', 'location'
    ]
    for (const key of allowed) {
      if (dto[key] !== undefined) {
        ;(profile as any)[key] = dto[key] === '' ? null : dto[key]
      }
    }

    return this.profileRepo.save(profile)
  }
}