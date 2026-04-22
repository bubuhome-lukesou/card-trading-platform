import { User } from './user.entity';
import { Auction } from './auction.entity';
export declare enum ProductCategory {
    POKEMON = "pokemon",
    YUGIOH = "yugioh",
    MTG = "mtg",
    ULTRAMAN = "ultraman",
    ONEPiece = "onepiece",
    OTHER = "other"
}
export declare enum ProductRarity {
    SSR = "SSR",
    SR = "SR",
    R = "R",
    N = "N"
}
export declare enum ProductCondition {
    MINT = "mint",
    NEAR_MINT = "near_mint",
    EXCELLENT = "excellent",
    GOOD = "good",
    FAIR = "fair"
}
export declare enum ListingType {
    SALE = "sale",
    AUCTION = "auction"
}
export declare enum ProductStatus {
    DRAFT = "draft",
    ACTIVE = "active",
    SOLD = "sold",
    ENDED = "ended",
    CANCELLED = "cancelled"
}
export declare class Product {
    id: string;
    sellerId: string;
    seller: User;
    category: ProductCategory;
    brand: string;
    series: string;
    rarity: ProductRarity;
    condition: ProductCondition;
    titleEn: string;
    titleZh: string;
    descriptionEn: string;
    descriptionZh: string;
    price: number;
    images: string;
    thumbnail: string;
    cardNumber: string;
    listingType: ListingType;
    status: ProductStatus;
    viewCount: number;
    favoriteCount: number;
    stock: number;
    auctions: Auction[];
    createdAt: Date;
    updatedAt: Date;
}
