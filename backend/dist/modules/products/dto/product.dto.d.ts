import { ProductCategory, ProductRarity, ProductCondition, ListingType, ProductStatus } from '../../../entities/product.entity';
export declare class ProductFiltersDto {
    category?: string[];
    brand?: string[];
    series?: string[];
    rarity?: ProductRarity[];
    condition?: ProductCondition[];
    priceMin?: number;
    priceMax?: number;
    listingType?: ListingType;
    status?: ProductStatus;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    tags?: string[];
}
export declare class CreateProductDto {
    category: ProductCategory;
    brand?: string;
    series?: string;
    rarity: ProductRarity;
    condition: ProductCondition;
    titleEn: string;
    titleZh: string;
    descriptionEn?: string;
    descriptionZh?: string;
    price: number;
    images?: any;
    thumbnail?: string;
    cardNumber?: string;
    listingType?: ListingType;
    startingPrice?: number;
    bidIncrement?: number;
    stock?: number;
    quantity?: number;
    tags?: string[];
}
export declare class UpdateProductDto {
    category?: ProductCategory;
    brand?: string;
    series?: string;
    rarity?: ProductRarity;
    condition?: ProductCondition;
    titleEn?: string;
    titleZh?: string;
    descriptionEn?: string;
    descriptionZh?: string;
    price?: number;
    images?: any;
    thumbnail?: string;
    cardNumber?: string;
    listingType?: ListingType;
    startingPrice?: number;
    bidIncrement?: number;
    status?: ProductStatus;
    stock?: number;
    quantity?: number;
    tags?: number[];
}
