import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Review, ReviewRole } from '../../entities/review.entity'
import { Order, OrderStatus, OrderType } from '../../entities/order.entity'

// 互評服務（2026-11-01）
// - 只有 delivered 訂單可評
// - 買家評商家（seller_review）、商家評買家（buyer_review）
// - 5 星必選；文字選填；最多 9 張圖
export interface CreateReviewDto {
  rating: number
  content?: string
  images?: string[]
}

const MAX_IMAGES = 9

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private reviewRepo: Repository<Review>,
    @InjectRepository(Order)
    private orderRepo: Repository<Order>,
  ) {}

  async createForOrder(orderId: string, userId: string, dto: CreateReviewDto) {
    const order = await this.orderRepo.findOne({ where: { id: orderId } })
    if (!order) throw new NotFoundException('Order not found')

    // 訂單必須已完成
    if (order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException('訂單完成後才可以評價')
    }

    const isBuyer = order.buyerId === userId
    const isSeller = order.sellerId === userId
    if (!isBuyer && !isSeller) throw new ForbiddenException('只有買賣雙方可以評價此訂單')

    const targetRole: ReviewRole = isBuyer ? ReviewRole.SELLER_REVIEW : ReviewRole.BUYER_REVIEW
    const targetUserId = isBuyer ? order.sellerId : order.buyerId

    // 每單每方向只可評一次（重複提交擋）
    const existing = await this.reviewRepo.findOne({ where: { orderId, reviewerId: userId, targetRole } })
    if (existing) throw new BadRequestException('You have already reviewed this order')

    // 5 星必選
    const rating = Number(dto.rating)
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new BadRequestException('Rating must be an integer from 1 to 5')
    }

    // 圖片上限 9
    let images: string[] = []
    if (Array.isArray(dto.images)) {
      images = dto.images.filter((u) => typeof u === 'string' && u.trim()).slice(0, MAX_IMAGES)
      if (dto.images.length > MAX_IMAGES) {
        throw new BadRequestException(`最多 ${MAX_IMAGES} 張圖片`)
      }
    }

    const review = this.reviewRepo.create({
      orderId,
      reviewerId: userId,
      targetUserId,
      targetRole,
      rating,
      content: (dto.content || '').trim() || null,
      images: images.length ? JSON.stringify(images) : null,
    })
    const saved = await this.reviewRepo.save(review)

    // 通知對方收到評價（non-fatal）
    try {
      /* notification 在 controller 注入，見下；此處僅返回 */
    } catch {}

    return saved
  }

  // 某訂單嘅評價（買賣雙方或 admin 可見）
  async findByOrder(orderId: string) {
    return this.reviewRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.reviewer', 'reviewer')
      .where('r.orderId = :orderId', { orderId })
      .orderBy('r.createdAt', 'DESC')
      .getMany()
  }

  // 某人收到的評價（公開：商家介紹頁 / 買家 profile）
  async findForTarget(targetUserId: string, role?: ReviewRole, limit = 50) {
    const qb = this.reviewRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.reviewer', 'reviewer')
      .where('r.targetUserId = :targetUserId', { targetUserId })
    if (role) qb.andWhere('r.targetRole = :role', { role })
    qb.orderBy('r.createdAt', 'DESC').take(limit)
    const rows = await qb.getMany()
    // 剝離 reviewer 敏感欄位（email/phone/password）
    return rows.map((r) => {
      const { email, phone, password, googleId, emailVerificationToken, resetPasswordToken, ...safeReviewer } = (r.reviewer || {}) as any
      return { ...r, reviewer: safeReviewer }
    })
  }

  // 統計：平均分 + 總數（商家介紹頁頭部用）
  async getStats(targetUserId: string, role: ReviewRole) {
    const result = await this.reviewRepo
      .createQueryBuilder('r')
      .where('r.targetUserId = :targetUserId', { targetUserId })
      .andWhere('r.targetRole = :role', { role })
      .select('COALESCE(AVG(r.rating),0)', 'avg')
      .addSelect('COUNT(*)', 'count')
      .getRawOne()
    return {
      avg: Math.round(Number(result?.avg || 0) * 10) / 10,
      count: Number(result?.count || 0),
    }
  }

  // 賣家回覆評價
  async reply(reviewId: string, userId: string, content: string) {
    const review = await this.reviewRepo.findOne({ where: { id: reviewId } })
    if (!review) throw new NotFoundException('Review not found')
    // 只有被評方（targetUserId）可回覆
    if (review.targetUserId !== userId) throw new ForbiddenException('無權回覆此評價')
    review.reply = (content || '').trim() || null
    return this.reviewRepo.save(review)
  }
}