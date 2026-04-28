import { Controller, Get, Post, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CartService } from './cart.service';

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private cartService: CartService) {}

  @Get()
  getCart(@Request() req) {
    return this.cartService.findAll(req.user.id);
  }

  @Post('items')
  addItem(@Request() req, @Body() body: { productId: string; quantity?: number }) {
    return this.cartService.addItem(req.user.id, body.productId, body.quantity || 1);
  }

  @Delete('items/:id')
  removeItem(@Param('id') id: string, @Request() req) {
    return this.cartService.removeItem(id, req.user.id);
  }

  @Delete()
  clearCart(@Request() req) {
    return this.cartService.clearCart(req.user.id);
  }
}
