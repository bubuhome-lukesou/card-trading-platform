import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ReservationsController } from './reservations.controller'
import { ReservationsService } from './reservations.service'
import { Reservation } from '../../entities/reservation.entity'
import { Product } from '../../entities/product.entity'
import { Order } from '../../entities/order.entity'
import { OrdersModule } from '../orders/orders.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([Reservation, Product, Order]),
    OrdersModule,
  ],
  controllers: [ReservationsController],
  providers: [ReservationsService],
  exports: [ReservationsService]
})
export class ReservationsModule {}