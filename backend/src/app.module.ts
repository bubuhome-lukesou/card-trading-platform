import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { AuthModule } from './modules/auth/auth.module'
import { ProductsModule } from './modules/products/products.module'
import { AuctionsModule } from './modules/auctions/auctions.module'
import { User } from './entities/user.entity'
import { Product } from './entities/product.entity'
import { Auction, Bid } from './entities/auction.entity'
import { Order } from './entities/order.entity'

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST || '47.242.110.155',
      port: parseInt(process.env.DB_PORT || '3306'),
      username: process.env.DB_USERNAME || 'card_admin',
      password: process.env.DB_PASSWORD || 'CardAuction2026!',
      database: process.env.DB_DATABASE || 'card_auction',
      entities: [User, Product, Auction, Bid, Order],
      synchronize: true,
      logging: process.env.NODE_ENV === 'development'
    }),
    AuthModule,
    ProductsModule,
    AuctionsModule
  ],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule {}
