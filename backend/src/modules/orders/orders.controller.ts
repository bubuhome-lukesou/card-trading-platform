import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrdersService } from './orders.service';
import { Order } from '../../entities/order.entity';

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

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.ordersService.updateStatus(id, status);
  }
}

