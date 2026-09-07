import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common'
import { ProductsService } from './products.service'
import { CreateProductDto, UpdateProductDto, ProductFiltersDto } from './dto/product.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  async findAll(@Query() filters: ProductFiltersDto) {
    return this.productsService.findAll(filters)
  }

  // Marketplace 商家篩選下拉選單：列出有在售商品的商家（id/nickname/avatar/商品數）
  @Get('sellers')
  async listSellers() {
    const rows = await this.productsService['dataSource'].query(
      `SELECT u.id, u.nickname, u.avatar, COUNT(p.id) AS productCount
       FROM users u
       INNER JOIN products p ON p.sellerId = u.id AND p.status = 'active' AND p.isActive = 1
       WHERE u.role IN ('user', 'seller', 'admin') OR u.role = 'seller'
       GROUP BY u.id, u.nickname, u.avatar
       ORDER BY productCount DESC, u.nickname ASC
       LIMIT 500`
    )
    return { data: rows }
  }

  @UseGuards(JwtAuthGuard)
  @Get('seller')
  async findMyProducts(@Request() req: any, @Query('page') page?: string, @Query('limit') limit?: string) {
    // S14: Pass pagination params through (previously ignored)
    const pageNum = page ? Number(page) : undefined
    const limitNum = limit ? Number(limit) : undefined
    return this.productsService.findBySeller(req.user.id, pageNum, limitNum)
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.productsService.findOne(id)
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() dto: CreateProductDto, @Request() req: any) {
    return this.productsService.create(dto, req.user.id)
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateProductDto, @Request() req: any) {
    console.log('[DEBUG] Controller received update dto:', JSON.stringify(dto, null, 2))
    return this.productsService.update(id, dto, req.user.id)
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req: any) {
    return this.productsService.remove(id, req.user.id)
  }
}
