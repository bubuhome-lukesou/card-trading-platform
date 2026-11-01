import { Controller, Get, Post, Param, Body, Query, UseGuards, Request, ForbiddenException } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { ReviewsService, CreateReviewDto } from './reviews.service'
import { ReviewRole } from '../../entities/review.entity'

// 互評 API（2026-11-01）
// - POST /reviews/order/:orderId   寫評價（登入）
// - GET  /reviews/order/:orderId   讀某單評價（雙方/登入者皆可讀，公開端）
// - GET  /reviews/target/:userId   某人收到的評價（公開）?role=seller_review|buyer_review
// - GET  /reviews/target/:userId/stats 統計（公開）
@Controller('reviews')
export class ReviewsController {
  constructor(private reviewsService: ReviewsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('order/:orderId')
  create(@Param('orderId') orderId: string, @Request() req, @Body() dto: CreateReviewDto) {
    return this.reviewsService.createForOrder(orderId, req.user.id, dto)
  }

  @Get('order/:orderId')
  findByOrder(@Param('orderId') orderId: string) {
    return this.reviewsService.findByOrder(orderId)
  }

  @Get('target/:userId/stats')
  stats(@Param('userId') userId: string, @Query('role') role?: string) {
    const r = role === 'buyer_review' ? ReviewRole.BUYER_REVIEW : ReviewRole.SELLER_REVIEW
    return this.reviewsService.getStats(userId, r)
  }

  @Get('target/:userId')
  findForTarget(@Param('userId') userId: string, @Query('role') role?: string) {
    const r = role === 'buyer_review' ? ReviewRole.BUYER_REVIEW : role === 'seller_review' ? ReviewRole.SELLER_REVIEW : undefined
    return this.reviewsService.findForTarget(userId, r)
  }

  // 賣家回覆評價（只有被評方可回覆）
  @UseGuards(JwtAuthGuard)
  @Post(':id/reply')
  reply(@Param('id') id: string, @Request() req, @Body() body: { content: string }) {
    return this.reviewsService.reply(id, req.user.id, body?.content || '')
  }
}