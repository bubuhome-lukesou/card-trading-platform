import { Controller, Get, Patch, Body, Param, Query, UseGuards } from '@nestjs/common'
import { PagesService } from './pages.service'
import { UpdatePageDto } from './dto/update-page.dto'
import { PageType } from '../../entities/page.entity'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard, Roles } from '../auth/guards/roles.guard'

@Controller('pages')
export class PagesController {
  constructor(private readonly pagesService: PagesService) {}

  @Get()
  findAll() {
    return this.pagesService.findAll()
  }

  @Get(':type')
  findOne(
    @Param('type') type: string,
    @Query('locale') locale: string = 'zh',
  ) {
    return this.pagesService.findByType(type as PageType, locale)
  }

  @Patch()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  update(@Body() dto: UpdatePageDto) {
    return this.pagesService.update(dto)
  }
}
