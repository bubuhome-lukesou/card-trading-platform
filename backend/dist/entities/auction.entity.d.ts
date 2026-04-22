import { User } from './user.entity';
import { Product } from './product.entity';
import { Bid } from './bid.entity';
export declare enum AuctionStatus {
    PENDING = "pending",
    ACTIVE = "active",
    ENDED = "ended",
    CANCELLED = "cancelled"
}
export declare class Auction {
    id: string;
    productId: string;
    product: Product;
    sellerId: string;
    seller: User;
    startingPrice: number;
    currentPrice: number;
    reservePrice: number;
    buyNowPrice: number;
    startTime: Date;
    endTime: Date;
    extensionMinutes: number;
    status: AuctionStatus;
    bidCount: number;
    winnerId: string;
    winner: User;
    bids: Bid[];
    createdAt: Date;
    updatedAt: Date;
}
export { Bid } from './bid.entity';
