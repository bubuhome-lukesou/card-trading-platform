import { AuctionStatus } from '../../../entities/auction.entity';
import { ProductRarity } from '../../../entities/product.entity';
export declare class AuctionFiltersDto {
    category?: string[];
    brand?: string[];
    rarity?: ProductRarity[];
    status?: AuctionStatus;
    priceMin?: number;
    priceMax?: number;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sellerId?: string;
}
export declare class CreateAuctionDto {
    productId: string;
    startingPrice: number;
    reservePrice?: number;
    buyNowPrice?: number;
    startTime?: string;
    endTime?: string;
    durationHours?: number;
    extensionMinutes?: number;
}
export declare class PlaceBidDto {
    amount: number;
}
