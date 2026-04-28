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
  getOrder(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Post()
  createOrder(@Request() req, @Body() body: Partial<Order>) {
    return this.ordersService.create({ ...body, buyerId: req.user.id });
  }

  @Post(':id/confirm-payment')
  confirmPayment(@Param('id') id: string) {
    return this.ordersService.confirmPayment(id);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.ordersService.updateStatus(id, status);
  }

  @Post(':id/transfer-receipt')
  @UseInterceptors(FileInterceptor('receipt'))
  uploadTransferReceipt(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    if (!file) {
      return { success: false, error: 'No file uploaded' };
    }
    const receiptUrl = `/uploads/${file.filename}`;
    return this.ordersService.updateTransferReceipt(id, receiptUrl);
  }
}

