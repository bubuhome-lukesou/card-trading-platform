import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { SellerProfile } from '../../entities/seller-profile.entity'
import { User } from '../../entities/user.entity'
import { SellerProfilesController } from './seller-profiles.controller'
import { SellerProfilesService } from './seller-profiles.service'

@Module({
  imports: [TypeOrmModule.forFeature([SellerProfile, User])],
  controllers: [SellerProfilesController],
  providers: [SellerProfilesService],
  exports: [SellerProfilesService]
})
export class SellerProfilesModule {}