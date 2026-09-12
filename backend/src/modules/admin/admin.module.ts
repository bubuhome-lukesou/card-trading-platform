import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../entities/user.entity';
import { Settings } from '../../entities/settings.entity';
import { Product } from '../../entities/product.entity';
import { Order } from '../../entities/order.entity';
import { Auction } from '../../entities/auction.entity';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Settings, Product, Order, Auction])],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
