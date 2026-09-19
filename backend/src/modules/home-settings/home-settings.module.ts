import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { HomeSettings } from '../../entities/home-settings.entity'
import { HomeSettingsController } from './home-settings.controller'
import { HomeSettingsService } from './home-settings.service'

@Module({
  imports: [TypeOrmModule.forFeature([HomeSettings])],
  controllers: [HomeSettingsController],
  providers: [HomeSettingsService],
})
export class HomeSettingsModule {}