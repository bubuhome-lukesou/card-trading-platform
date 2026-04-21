import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuctionsController } from './auctions.controller'
import { AuctionsService } from './auctions.service'
import { Auction, Bid } from '../../entities/auction.entity'
import { Product } from '../../entities/product.entity'

@Module({
  imports: [TypeOrmModule.forFeature([Auction, Bid, Product])],
  controllers: [AuctionsController],
  providers: [AuctionsService],
  exports: [AuctionsService]
})
export class AuctionsModule {}
