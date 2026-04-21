import { ProductCategory, ProductRarity, ProductCondition, ListingType, ProductStatus } from '../../entities/product.entity';
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
}
export declare class CreateProductDto {
    category: ProductCategory;
    brand: string;
    series?: string;
    rarity: ProductRarity;
    condition: ProductCondition;
    titleEn: string;
    titleZh: string;
    descriptionEn?: string;
    descriptionZh?: string;
    price: number;
    images?: string;
    thumbnail?: string;
    cardNumber?: string;
    listingType: ListingType;
    stock?: number;
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
    images?: string;
    thumbnail?: string;
    cardNumber?: string;
    listingType?: ListingType;
    status?: ProductStatus;
    stock?: number;
}
