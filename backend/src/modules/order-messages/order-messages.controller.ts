import { Controller, Get, Post, Param, Body, UseGuards, Request } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { OrderMessagesService, PostMessageDto } from './order-messages.service'

// 訂單聊天 API（2026-11-01）— 掛 /orders 前綴下同 orders controller 共用 /orders/:id 空間
// 注意：controller 係 'order-messages' 自身前綴，/api/order-messages/order/:orderId —
// 避免同 /orders/:id 衝突（POST /orders/:id/xxx 會同呢度無關）
@Controller('order-messages')
@UseGuards(JwtAuthGuard)
export class OrderMessagesController {
  constructor(private messagesService: OrderMessagesService) {}

  @Get('order/:orderId')
  list(@Param('orderId') orderId: string, @Request() req) {
    return this.messagesService.listMessages(orderId, req.user.id)
  }

  @Post('order/:orderId')
  post(@Param('orderId') orderId: string, @Request() req, @Body() dto: PostMessageDto) {
    return this.messagesService.postMessage(orderId, req.user.id, dto)
  }
}