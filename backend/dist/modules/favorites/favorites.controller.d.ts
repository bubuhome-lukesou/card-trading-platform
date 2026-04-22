import { FavoritesService } from './favorites.service';
export declare class FavoritesController {
    private favoritesService;
    constructor(favoritesService: FavoritesService);
    getFavorites(req: any, page?: string, limit?: string): Promise<{
        data: import("../../entities/favorite.entity").Favorite[];
        total: number;
        page: number;
        limit: number;
    }>;
    addFavorite(req: any, productId: string): Promise<import("../../entities/favorite.entity").Favorite>;
    removeFavorite(req: any, productId: string): Promise<{
        deleted: boolean;
    }>;
    checkFavorite(req: any, productId: string): {
        isFavorite: boolean;
    };
}
