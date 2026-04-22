import { Product } from './product.entity';
export declare class Favorite {
    id: string;
    userId: string;
    productId: string;
    product: Product;
    createdAt: Date;
}
