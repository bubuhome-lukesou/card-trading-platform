import { Controller, Get, Post, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BidsService } from './bids.service';

@Controller('bids')
@UseGuards(JwtAuthGuard)
export class BidsController {
  constructor(private bidsService: BidsService) {}

  @Get('my')
  getMyBids(@Request() req, @Query('page') page = '1', @Query('limit') limit = '20') {
    return this.bidsService.findByUser(req.user.id, Number(page), Number(limit));
  }

  @Get('auction/:auctionId')
  getAuctionBids(@Param('auctionId') auctionId: string) {
    return this.bidsService.findByAuction(auctionId);
  }

  @Post()
  createBid(@Request() req, @Body() body: { auctionId: string; amount: number }) {
    return this.bidsService.create({
      auctionId: body.auctionId,
      userId: req.user.id,
      amount: body.amount,
    });
  }
}
