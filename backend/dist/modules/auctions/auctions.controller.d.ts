import { AuctionsService } from './auctions.service';
import { CreateAuctionDto, PlaceBidDto, AuctionFiltersDto } from './dto/auction.dto';
export declare class AuctionsController {
    private readonly auctionsService;
    constructor(auctionsService: AuctionsService);
    findAll(filters: AuctionFiltersDto): Promise<{
        data: import("../../entities").Auction[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getMyAuctions(req: any): Promise<{
        data: import("../../entities").Auction[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    findOne(id: string): Promise<import("../../entities").Auction>;
    create(dto: CreateAuctionDto, req: any): Promise<import("../../entities").Auction>;
    placeBid(id: string, dto: PlaceBidDto, req: any): Promise<{
        bid: import("../../entities").Bid;
        auction: {
            currentPrice: number;
            endTime: Date;
            bidCount: number;
        };
    }>;
    cancel(id: string, req: any): Promise<import("../../entities").Auction>;
}
