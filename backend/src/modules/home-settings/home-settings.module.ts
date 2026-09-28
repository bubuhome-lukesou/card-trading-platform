import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { HomeSettings } from '../../entities/home-settings.entity'
import { User } from '../../entities/user.entity'
import { Product } from '../../entities/product.entity'
import { Order } from '../../entities/order.entity'
import { HomeSettingsController } from './home-settings.controller'
import { HomeSettingsService } from './home-settings.service'

@Module({
  imports: [TypeOrmModule.forFeature([HomeSettings, User, Product, Order])],
  controllers: [HomeSettingsController],
  providers: [HomeSettingsService],
})
export class HomeSettingsModule {}