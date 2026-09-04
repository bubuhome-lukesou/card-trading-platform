import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bid, BidStatus } from '../../entities/bid.entity';
import { Auction } from '../../entities/auction.entity';

@Injectable()
export class BidsService {
  constructor(
    @InjectRepository(Bid)
    private bidRepo: Repository<Bid>,
    @InjectRepository(Auction)
    private auctionRepo: Repository<Auction>,
  ) {}

  async findByUser(userId: string, page = 1, limit = 20) {
    const [data, total] = await this.bidRepo.findAndCount({
      where: { bidderId: userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit };
  }

  async findByAuction(auctionId: string) {
    return this.bidRepo.find({
      where: { auctionId },
      order: { amount: 'DESC', createdAt: 'DESC' },
    });
  }

  // NOTE: The unsafe create() method has been removed.
  // All bid creation must go through AuctionsService.placeBid() which has
  // proper validation: auction status check, seller self-bid prevention,
  // minimum bid enforcement, and optimistic locking for concurrency.
  // This service is now read-only for bid queries.
}