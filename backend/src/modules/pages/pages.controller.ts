import { Controller, Get, Patch, Body, Param, Query } from '@nestjs/common'
import { PagesService } from './pages.service'
import { UpdatePageDto } from './dto/update-page.dto'
import { PageType } from '../../../entities/page.entity'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { AdminGuard } from '../admin/guards/admin.guard'
import { UseGuards } from '@nestjs/common'

@Controller('pages')
export class PagesController {
  constructor(private readonly pagesService: PagesService) {}

  @Get()
  findAll() {
    return this.pagesService.findAll()
  }

  @Get(':type')
  findOne(
    @Param('type') type: PageType,
    @Query('locale') locale: string = 'zh',
  ) {
    return this.pagesService.findByType(type, locale)
  }

  @Patch()
  @UseGuards(JwtAuthGuard, AdminGuard)
  update(@Body() dto: UpdatePageDto) {
    return this.pagesService.update(dto)
  }
}
