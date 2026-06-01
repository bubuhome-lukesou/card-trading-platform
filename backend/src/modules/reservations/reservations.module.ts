import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ReservationsController } from './reservations.controller'
import { ReservationsService } from './reservations.service'
import { Reservation } from '../../entities/reservation.entity'
import { Product } from '../../entities/product.entity'

@Module({
  imports: [TypeOrmModule.forFeature([Reservation, Product])],
  controllers: [ReservationsController],
  providers: [ReservationsService],
  exports: [ReservationsService]
})
export class ReservationsModule {}