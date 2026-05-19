import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request } from '@nestjs/common'
import { AuctionsService } from './auctions.service'
import { CreateAuctionDto, PlaceBidDto, AuctionFiltersDto } from './dto/auction.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'

@Controller('auctions')
export class AuctionsController {
  constructor(private readonly auctionsService: AuctionsService) {}

  @Get()
  async findAll(@Query() filters: AuctionFiltersDto) {
    return this.auctionsService.findAll(filters)
  }

  @UseGuards(JwtAuthGuard)
  @Get('seller/my')
  async getMyAuctions(@Request() req: any) {
    return this.auctionsService.findAll({ sellerId: req.user.id } as any)
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.auctionsService.findOne(id)
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() dto: CreateAuctionDto, @Request() req: any) {
    return this.auctionsService.create(dto, req.user.id)
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/bids')
  async placeBid(@Param('id') id: string, @Body() dto: PlaceBidDto, @Request() req: any) {
    return this.auctionsService.placeBid(id, dto.amount, req.user.id)
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id/cancel')
  async cancel(@Param('id') id: string, @Request() req: any) {
    return this.auctionsService.cancel(id, req.user.id)
  }
}
