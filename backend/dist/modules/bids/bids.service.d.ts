import { Repository } from 'typeorm';
import { Bid } from '../../entities/bid.entity';
import { Auction } from '../../entities/auction.entity';
export declare class BidsService {
    private bidRepo;
    private auctionRepo;
    constructor(bidRepo: Repository<Bid>, auctionRepo: Repository<Auction>);
    findByUser(userId: string, page?: number, limit?: number): Promise<{
        data: Bid[];
        total: number;
        page: number;
        limit: number;
    }>;
    findByAuction(auctionId: string): Promise<Bid[]>;
    create(data: {
        auctionId: string;
        userId: string;
        amount: number;
    }): Promise<Bid>;
}
