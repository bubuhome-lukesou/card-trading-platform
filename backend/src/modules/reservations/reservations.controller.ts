import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request } from '@nestjs/common'
import { ReservationsService } from './reservations.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'

@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() body: { productId: string; quantity?: number }, @Request() req) {
    const product = await this.reservationsService.getProduct(body.productId)
    const result = await this.reservationsService.create(
      body.productId,
      req.user.id,
      product.reservationDeposit,
      product.reservationDeadline,
      body.quantity ?? 1
    )
    return result
  }

  @UseGuards(JwtAuthGuard)
  @Get('my')
  async findMy(@Request() req) {
    return this.reservationsService.findByBuyer(req.user.id)
  }

  @Get('product/:productId')
  async findByProduct(@Param('productId') productId: string) {
    return this.reservationsService.findByProduct(productId)
  }

  @Get('seller')
  @UseGuards(JwtAuthGuard)
  async findBySeller(@Request() req) {
    return this.reservationsService.findBySeller(req.user.id)
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string) {
    return this.reservationsService.findOne(id)
  }

  @Post(':id/confirm-deposit')
  @UseGuards(JwtAuthGuard)
  async confirmDeposit(@Param('id') id: string, @Request() req) {
    return this.reservationsService.confirmDeposit(id, req.user.id)
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async cancel(@Param('id') id: string, @Request() req) {
    return this.reservationsService.cancel(id, req.user.id)
  }
}