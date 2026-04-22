import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ScheduleModule } from '@nestjs/schedule'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { AuthModule } from './modules/auth/auth.module'
import { ProductsModule } from './modules/products/products.module'
import { AuctionsModule } from './modules/auctions/auctions.module'
import { NotificationModule } from './modules/notification/notification.module'
import { User } from './entities/user.entity'
import { Product } from './entities/product.entity'
import { Auction } from './entities/auction.entity'
import { Bid } from './entities/bid.entity'
import { Order } from './entities/order.entity'
import { WebsocketModule } from './websocket/websocket.module'
import { AiModule } from './modules/ai/ai.module'
import { UploadModule } from './modules/upload/upload.module'
import { UsersModule } from './modules/users/users.module'
import { OrdersModule } from './modules/orders/orders.module'
import { BidsModule } from './modules/bids/bids.module'
import { FavoritesModule } from './modules/favorites/favorites.module'
import { WalletModule } from './modules/wallet/wallet.module'
import { Favorite } from './entities/favorite.entity'
import { WalletTransaction } from './entities/wallet.entity'
import { AdminModule } from './modules/admin/admin.module'

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '3306'),
      username: process.env.DB_USERNAME || 'card_admin',
      password: process.env.DB_PASSWORD || 'CardAuction2026!',
      database: process.env.DB_DATABASE || 'card_auction',
      entities: [User, Product, Auction, Bid, Order, Favorite, WalletTransaction],
      synchronize: true,
      logging: process.env.NODE_ENV === 'development'
    }),
    ScheduleModule.forRoot(),
    AuthModule,
    ProductsModule,
    AuctionsModule,
    NotificationModule,
    WebsocketModule,
    AiModule,
    UploadModule,
    UsersModule,
    OrdersModule,
    BidsModule,
    FavoritesModule,
    WalletModule,
    AdminModule
  ],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule {}
