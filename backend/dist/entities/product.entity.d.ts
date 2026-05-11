import { User } from './user.entity';
import { Auction } from './auction.entity';
import { Tag } from './tag.entity';
export declare enum ProductCategory {
    POKEMON = "pokemon",
    YUGIOH = "yugioh",
    MTG = "mtg",
    ULTRAMAN = "ultraman",
    ONEPiece = "onepiece",
    DORAEMON = "doraemon",
    SPORTS = "sports",
    OTHER = "other"
}
export declare enum ProductRarity {
    COMMON = "common",
    RARE = "rare",
    SUPER_RARE = "super_rare",
    ULTRA_RARE = "ultra_rare",
    SECRET_RARE = "***"
}
export declare enum ProductCondition {
    S = "S",
    A = "A",
    B = "B",
    C = "C",
    D = "D"
}
export declare enum ListingType {
    BOTH = "both",
    SALE_ONLY = "sale_only",
    AUCTION_ONLY = "auction_only"
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
    rarity: string;
    productTypeTagId: number | null;
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
    isActive: boolean;
    viewCount: number;
    favoriteCount: number;
    stock: number;
    quantity: number;
    auctions: Auction[];
    tags: Tag[];
    createdAt: Date;
    updatedAt: Date;
}
