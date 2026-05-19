import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ProductsController } from './products.controller'
import { ProductsService } from './products.service'
import { Product } from '../../entities/product.entity'
import { Tag } from '../../entities/tag.entity'

@Module({
  imports: [TypeOrmModule.forFeature([Product, Tag])],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService]
})
export class ProductsModule {}
