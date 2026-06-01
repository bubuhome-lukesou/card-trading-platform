import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request } from '@nestjs/common'
import { ReservationsService } from './reservations.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'

@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() body: { productId: string }, @Request() req) {
    // Get product to retrieve reservation settings
    const product = await this.reservationsService.getProduct(body.productId)
    return this.reservationsService.create(
      body.productId,
      req.user.userId,
      product.reservationDeposit,
      product.reservationDeadline
    )
  }

  @UseGuards(JwtAuthGuard)
  @Get('my')
  async findMy(@Request() req) {
    return this.reservationsService.findByBuyer(req.user.userId)
  }

  @Get('product/:productId')
  async findByProduct(@Param('productId') productId: string) {
    return this.reservationsService.findByProduct(productId)
  }

  @Get('seller')
  @UseGuards(JwtAuthGuard)
  async findBySeller(@Request() req) {
    return this.reservationsService.findBySeller(req.user.userId)
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string) {
    return this.reservationsService.findOne(id)
  }

  @Post(':id/confirm-deposit')
  @UseGuards(JwtAuthGuard)
  async confirmDeposit(@Param('id') id: string) {
    return this.reservationsService.confirmDeposit(id)
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async cancel(@Param('id') id: string, @Request() req) {
    return this.reservationsService.cancel(id, req.user.userId)
  }
}