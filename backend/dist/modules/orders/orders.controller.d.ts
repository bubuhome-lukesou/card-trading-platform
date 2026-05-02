import { OrdersService } from './orders.service';
import { Order } from '../../entities/order.entity';
export declare class OrdersController {
    private ordersService;
    constructor(ordersService: OrdersService);
    getMyOrders(req: any, page?: string, limit?: string): Promise<{
        data: Order[];
        total: number;
        page: number;
        limit: number;
    }>;
    getSellerOrders(req: any, page?: string, limit?: string): Promise<{
        data: Order[];
        total: number;
        page: number;
        limit: number;
    }>;
    getOrder(id: string): Promise<Order>;
    createOrder(req: any, body: Partial<Order>): Promise<Order>;
    confirmPayment(id: string): Promise<Order>;
    updateStatus(id: string, status: string): Promise<Order>;
    uploadTransferReceipt(id: string, file: Express.Multer.File): Promise<Order> | {
        success: boolean;
        error: string;
    };
}
