import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto, ProductFiltersDto } from './dto/product.dto';
export declare class ProductsController {
    private readonly productsService;
    constructor(productsService: ProductsService);
    findAll(filters: ProductFiltersDto): Promise<{
        data: import("../../entities").Product[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    findOne(id: string): Promise<import("../../entities").Product>;
    create(dto: CreateProductDto, req: any): Promise<import("../../entities").Product>;
    update(id: string, dto: UpdateProductDto, req: any): Promise<import("../../entities").Product>;
    remove(id: string, req: any): Promise<void>;
}
