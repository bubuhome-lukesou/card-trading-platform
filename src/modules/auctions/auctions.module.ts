import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Auction, Bid } from '../../entities/auction.entity'
import { Product } from '../../entities/product.entity'
import { AuctionsController } from './auctions.controller'
import { AuctionsService } from './auctions.service'

@Module({
  imports: [TypeOrmModule.forFeature([Auction, Bid, Product])],
  controllers: [AuctionsController],
  providers: [AuctionsService],
  exports: [AuctionsService]
})
export class AuctionsModule {}
