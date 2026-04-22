import { Repository } from 'typeorm';
import { Favorite } from '../../entities/favorite.entity';
export declare class FavoritesService {
    private favoriteRepo;
    constructor(favoriteRepo: Repository<Favorite>);
    findByUser(userId: string, page?: number, limit?: number): Promise<{
        data: Favorite[];
        total: number;
        page: number;
        limit: number;
    }>;
    add(userId: string, productId: string): Promise<Favorite>;
    remove(userId: string, productId: string): Promise<{
        deleted: boolean;
    }>;
    isFavorite(userId: string, productId: string): Promise<boolean>;
}
