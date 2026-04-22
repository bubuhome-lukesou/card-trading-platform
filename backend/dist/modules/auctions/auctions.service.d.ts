import { Repository } from 'typeorm';
import { Auction, Bid } from '../../entities/auction.entity';
import { Product } from '../../entities/product.entity';
import { CreateAuctionDto, AuctionFiltersDto } from './dto/auction.dto';
export declare class AuctionsService {
    private readonly auctionRepo;
    private readonly bidRepo;
    private readonly productRepo;
    constructor(auctionRepo: Repository<Auction>, bidRepo: Repository<Bid>, productRepo: Repository<Product>);
    activatePendingAuctions(): Promise<void>;
    findAll(filters: AuctionFiltersDto): Promise<{
        data: Auction[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    findOne(id: string): Promise<Auction>;
    create(dto: CreateAuctionDto, userId: string): Promise<Auction>;
    placeBid(auctionId: string, amount: number, userId: string): Promise<{
        bid: Bid;
        auction: {
            currentPrice: number;
            endTime: Date;
            bidCount: number;
        };
    }>;
    cancel(auctionId: string, userId: string): Promise<Auction>;
    endAuction(auctionId: string): Promise<Auction>;
}
