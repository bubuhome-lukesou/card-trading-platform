import { Repository } from 'typeorm';
import { Product } from '../../entities/product.entity';
import { CreateProductDto, UpdateProductDto, ProductFiltersDto } from './dto/product.dto';
export declare class ProductsService {
    private readonly productRepo;
    constructor(productRepo: Repository<Product>);
    findAll(filters: ProductFiltersDto): Promise<{
        data: Product[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    findOne(id: string): Promise<Product>;
    create(dto: CreateProductDto, userId: string): Promise<Product>;
    update(id: string, dto: UpdateProductDto, userId: string): Promise<Product>;
    remove(id: string, userId: string): Promise<void>;
    findBySeller(sellerId: string): Promise<Product[]>;
}
