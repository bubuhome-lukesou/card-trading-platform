import { User } from './user.entity';
import { Product } from './product.entity';
export declare enum OrderType {
    DIRECT_PURCHASE = "direct_purchase",
    BUY_NOW = "buy_now",
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
    totalPrice: number;
    shippingCost: number;
    platformFee: number;
    shippingAddress: string;
    trackingNumber: string;
    paymentMethod: string;
    paymentTime: Date;
    shippingTime: Date;
    deliveryTime: Date;
    notes: string;
    createdAt: Date;
    updatedAt: Date;
}
