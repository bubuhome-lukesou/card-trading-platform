import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { SellerApplication } from '../../entities/seller-application.entity'
import { User } from '../../entities/user.entity'
import { SellerApplicationsController } from './seller-applications.controller'
import { SellerApplicationsService } from './seller-applications.service'

@Module({
  imports: [TypeOrmModule.forFeature([SellerApplication, User])],
  controllers: [SellerApplicationsController],
  providers: [SellerApplicationsService],
  exports: [SellerApplicationsService]
})
export class SellerApplicationsModule {}
