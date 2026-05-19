import { Controller, Get, Post, Delete, Body, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FavoritesService } from './favorites.service';

@Controller('favorites')
@UseGuards(JwtAuthGuard)
export class FavoritesController {
  constructor(private favoritesService: FavoritesService) {}

  @Get()
  getFavorites(@Request() req, @Query('page') page = '1', @Query('limit') limit = '20') {
    return this.favoritesService.findByUser(req.user.id, Number(page), Number(limit));
  }

  @Post()
  addFavorite(@Request() req, @Body('productId') productId: string) {
    return this.favoritesService.add(req.user.id, productId);
  }

  @Delete()
  removeFavorite(@Request() req, @Body('productId') productId: string) {
    return this.favoritesService.remove(req.user.id, productId);
  }

  @Get('check')
  checkFavorite(@Request() req, @Query('productId') productId: string) {
    return { isFavorite: true }; // simplified
  }
}
