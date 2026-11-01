import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, UseInterceptors, UploadedFile, Request, ForbiddenException, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrdersService } from './orders.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { ReviewsService } from '../reviews/reviews.service';

const PICKUP_TIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(
    private ordersService: OrdersService,
    private reviewsService: ReviewsService,
  ) {}

  @Get()
  getMyOrders(@Request() req, @Query('page') page = '1', @Query('limit') limit = '20', @Query('search') search?: string) {
    return this.ordersService.findByBuyer(req.user.id, Number(page), Number(limit), search);
  }

  @Get('seller')
  getSellerOrders(@Request() req, @Query('page') page = '1', @Query('limit') limit = '20') {
    return this.ordersService.findBySeller(req.user.id, Number(page), Number(limit));
  }

  @Get(':id')
  async getOrder(@Param('id') id: string, @Request() req) {
    const order = await this.ordersService.findOne(id);
    // Permission check — only buyer or seller can view
    if (order.buyerId !== req.user.id && order.sellerId !== req.user.id) {
      throw new ForbiddenException('You do not have permission to view this order');
    }
    return order;
  }

  @Post()
  createOrder(@Request() req, @Body() body: { productId: string; quantity?: number; type?: string; reservationId?: string }) {
    // Route to createFromBuyer for direct purchases (with validation)
    // Reservation/auction orders are created internally, not via this endpoint
    if (body.type && body.type !== 'direct_purchase') {
      // For non-direct types, only allow if called internally (reservations service uses ordersService.create directly)
      throw new BadRequestException('Use the dedicated endpoint for this order type');
    }
    return this.ordersService.createFromBuyer(req.user.id, body.productId, body.quantity || 1);
  }

  @Post(':id/confirm-payment')
  confirmPayment(@Param('id') id: string, @Request() req) {
    return this.ordersService.confirmPayment(id, req.user.id);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: string, @Request() req) {
    return this.ordersService.updateStatus(id, status, req.user.id);
  }

  @Post(':id/transfer-receipt')
  @UseInterceptors(FileInterceptor('receipt'))
  uploadTransferReceipt(@Param('id') id: string, @UploadedFile() file: Express.Multer.File, @Request() req) {
    if (!file) {
      return { success: false, error: 'No file uploaded' };
    }
    const receiptUrl = `/uploads/${file.filename}`;
    return this.ordersService.updateTransferReceipt(id, receiptUrl, req.user.id);
  }

  @Post(':id/balance-receipt')
  @UseInterceptors(FileInterceptor('receipt'))
  uploadBalanceReceipt(@Param('id') id: string, @UploadedFile() file: Express.Multer.File, @Request() req) {
    if (!file) {
      return { success: false, error: 'No file uploaded' };
    }
    const receiptUrl = `/uploads/${file.filename}`;
    return this.ordersService.updateBalanceReceipt(id, receiptUrl, req.user.id);
  }

  // ===== 攞貨時間協調（2026-11-01）=====
  // 買家提出/重提攞貨時間 → 訂單 pending→pending_paid（待商家確認），憑證可後補
  @Post(':id/pickup-time')
  proposePickupTime(@Param('id') id: string, @Request() req, @Body() body: { pickupTime: string }) {
    return this.ordersService.proposePickupTime(id, req.user.id, body?.pickupTime);
  }

  // 商家確認攞貨時間 → pickupConfirmStatus=confirmed
  @Post(':id/pickup-time/confirm')
  confirmPickupTime(@Param('id') id: string, @Request() req) {
    return this.ordersService.confirmPickupTime(id, req.user.id);
  }

  // 買家確認取貨 → delivered（完成訂單）
  @Post(':id/pickup-confirm')
  confirmPickup(@Param('id') id: string, @Request() req) {
    return this.ordersService.confirmPickup(id, req.user.id);
  }

  // ===== 互評（2026-11-01）=====
  @Post(':id/review')
  createReview(
    @Param('id') id: string,
    @Request() req,
    @Body() body: { rating: number; content?: string; images?: string[] },
  ) {
    return this.reviewsService.createForOrder(id, req.user.id, {
      rating: body?.rating,
      content: body?.content,
      images: Array.isArray(body?.images) ? body.images : [],
    });
  }

  @Get(':id/review')
  getOrderReviews(@Param('id') id: string, @Request() req) {
    return this.reviewsService.findByOrder(id);
  }

  @Post(':id/receipt')
  @UseInterceptors(FileInterceptor('receipt'))
  uploadAnyReceipt(@Param('id') id: string, @UploadedFile() file: Express.Multer.File, @Request() req) {
    if (!file) {
      return { success: false, error: 'No file uploaded' };
    }
    const receiptUrl = `/uploads/${file.filename}`;
    return this.ordersService.updateTransferReceipt(id, receiptUrl, req.user.id);
  }
}

// 驗證營業時間格式 helper re-export（service 用）
export { PICKUP_TIME_RE };