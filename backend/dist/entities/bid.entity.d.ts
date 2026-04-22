import { Auction } from './auction.entity';
import { User } from './user.entity';
export declare enum BidStatus {
    ACTIVE = "active",
    WON = "won",
    OUTBID = "outbid",
    CANCELLED = "cancelled"
}
export declare class Bid {
    id: string;
    auctionId: string;
    auction: Auction;
    bidderId: string;
    bidder: User;
    amount: number;
    status: BidStatus;
    createdAt: Date;
}
