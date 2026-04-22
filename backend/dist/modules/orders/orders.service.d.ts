import { Repository } from 'typeorm';
import { Order } from '../../entities/order.entity';
import { Product } from '../../entities/product.entity';
export declare class OrdersService {
    private orderRepo;
    private productRepo;
    constructor(orderRepo: Repository<Order>, productRepo: Repository<Product>);
    findByBuyer(buyerId: string, page?: number, limit?: number): Promise<{
        data: Order[];
        total: number;
        page: number;
        limit: number;
    }>;
    findBySeller(sellerId: string, page?: number, limit?: number): Promise<{
        data: Order[];
        total: number;
        page: number;
        limit: number;
    }>;
    findOne(id: string): Promise<Order>;
    create(data: Partial<Order>): Promise<Order>;
    updateStatus(id: string, status: string): Promise<Order>;
}
