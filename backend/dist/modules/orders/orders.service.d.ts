import { Repository } from 'typeorm';
import { Order } from '../../entities/order.entity';
import { Product } from '../../entities/product.entity';
import { ProductsService } from '../products/products.service';
export declare class OrdersService {
    private orderRepo;
    private productRepo;
    private productsService;
    constructor(orderRepo: Repository<Order>, productRepo: Repository<Product>, productsService: ProductsService);
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
    confirmPayment(orderId: string): Promise<Order>;
    updateTransferReceipt(orderId: string, receiptUrl: string): Promise<Order>;
    updateStatus(id: string, status: string): Promise<Order>;
}
