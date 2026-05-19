import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Favorite } from '../../entities/favorite.entity';

@Injectable()
export class FavoritesService {
  constructor(
    @InjectRepository(Favorite)
    private favoriteRepo: Repository<Favorite>,
  ) {}

  async findByUser(userId: string, page = 1, limit = 20) {
    const [data, total] = await this.favoriteRepo.findAndCount({
      where: { userId },
      relations: ['product', 'product.tags'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Parse images JSON string → array for each product
    for (const fav of data) {
      if (fav.product?.images && typeof fav.product.images === 'string') {
        try {
          (fav.product as any).images = JSON.parse(fav.product.images);
        } catch {
          (fav.product as any).images = [fav.product.images];
        }
      }
    }

    return { data, total, page, limit };
  }

  async add(userId: string, productId: string) {
    const existing = await this.favoriteRepo.findOne({ where: { userId, productId } });
    if (existing) return existing;
    const favorite = this.favoriteRepo.create({ userId, productId });
    return this.favoriteRepo.save(favorite);
  }

  async remove(userId: string, productId: string) {
    await this.favoriteRepo.delete({ userId, productId });
    return { deleted: true };
  }

  async isFavorite(userId: string, productId: string) {
    const fav = await this.favoriteRepo.findOne({ where: { userId, productId } });
    return !!fav;
  }
}
