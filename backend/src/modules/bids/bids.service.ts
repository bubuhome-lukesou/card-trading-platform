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

  async create(data: { auctionId: string; userId: string; amount: number }) {
    // Mark previous bids as outbid
    await this.bidRepo.update(
      { auctionId: data.auctionId, bidderId: data.userId, status: BidStatus.ACTIVE },
      { status: BidStatus.OUTBID },
    );
    const bid = this.bidRepo.create({ auctionId: data.auctionId, bidderId: data.userId, amount: data.amount, status: BidStatus.ACTIVE });
    await this.bidRepo.save(bid);

    // Update auction bidCount and currentPrice
    await this.auctionRepo.increment({ id: data.auctionId }, 'bidCount', 1);
    await this.auctionRepo.update(data.auctionId, { currentPrice: data.amount });

    return bid;
  }
}

