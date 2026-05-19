import { User } from './user.entity';
import { Product } from './product.entity';
export declare enum OrderType {
    PURCHASE = "purchase",
    AUCTION_WIN = "auction_win"
}
export declare enum OrderStatus {
    PENDING = "pending",
    PAID = "paid",
    SHIPPED = "shipped",
    DELIVERED = "delivered",
    CANCELLED = "cancelled",
    REFUNDED = "refunded"
}
export declare class Order {
    id: string;
    orderNumber: string;
    buyerId: string;
    buyer: User;
    sellerId: string;
    seller: User;
    productId: string;
    product: Product;
    type: OrderType;
    status: OrderStatus;
    amount: number;
    shippingFee: number;
    platformFee: number;
    auctionId: string;
    shippingAddress: string;
    trackingNumber: string;
    paidAt: Date;
    shippedAt: Date;
    deliveredAt: Date;
    createdAt: Date;
    updatedAt: Date;
}
