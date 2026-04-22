import { BidsService } from './bids.service';
export declare class BidsController {
    private bidsService;
    constructor(bidsService: BidsService);
    getMyBids(req: any, page?: string, limit?: string): Promise<{
        data: import("../../entities").Bid[];
        total: number;
        page: number;
        limit: number;
    }>;
    getAuctionBids(auctionId: string): Promise<import("../../entities").Bid[]>;
    createBid(req: any, body: {
        auctionId: string;
        amount: number;
    }): Promise<import("../../entities").Bid>;
}
