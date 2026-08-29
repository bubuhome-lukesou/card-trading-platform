import { Controller, Get, Param, Query, UseGuards, Request } from '@nestjs/common';
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

  // NOTE: POST /bids (createBid) removed — use POST /auctions/:id/bids instead.
  // The auctions.service.placeBid has proper validation: status checks, time checks,
  // seller self-bid prevention, optimistic locking, and price validation.
}
