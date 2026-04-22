import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Bid } from '../../entities/bid.entity';
import { Auction } from '../../entities/auction.entity';
import { BidsController } from './bids.controller';
import { BidsService } from './bids.service';

@Module({
  imports: [TypeOrmModule.forFeature([Bid, Auction])],
  controllers: [BidsController],
  providers: [BidsService],
  exports: [BidsService],
})
export class BidsModule {}

