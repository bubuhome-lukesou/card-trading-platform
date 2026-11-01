import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { OrderMessage } from '../../entities/order-message.entity'
import { Order } from '../../entities/order.entity'
import { OrderMessagesController } from './order-messages.controller'
import { OrderMessagesService } from './order-messages.service'

@Module({
  imports: [TypeOrmModule.forFeature([OrderMessage, Order])],
  controllers: [OrderMessagesController],
  providers: [OrderMessagesService],
  exports: [OrderMessagesService],
})
export class OrderMessagesModule {}