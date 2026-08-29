import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, UseInterceptors, UploadedFile, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrdersService } from './orders.service';
import { Order } from '../../entities/order.entity';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Get()
  getMyOrders(@Request() req, @Query('page') page = '1', @Query('limit') limit = '20') {
    return this.ordersService.findByBuyer(req.user.id, Number(page), Number(limit));
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
      return { message: 'You do not have permission to view this order', statusCode: 403 };
    }
    return order;
  }

  @Post()
  createOrder(@Request() req, @Body() body: Partial<Order>) {
    return this.ordersService.create({ ...body, buyerId: req.user.id });
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
}