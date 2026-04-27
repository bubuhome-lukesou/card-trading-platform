"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuctionsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const schedule_1 = require("@nestjs/schedule");
const auction_entity_1 = require("../../entities/auction.entity");
const product_entity_1 = require("../../entities/product.entity");
let AuctionsService = class AuctionsService {
    constructor(auctionRepo, bidRepo, productRepo) {
        this.auctionRepo = auctionRepo;
        this.bidRepo = bidRepo;
        this.productRepo = productRepo;
    }
    async activatePendingAuctions() {
        const now = new Date();
        const pendingAuctions = await this.auctionRepo.find({
            where: {
                status: auction_entity_1.AuctionStatus.PENDING,
                startTime: (0, typeorm_2.LessThanOrEqual)(now)
            }
        });
        for (const auction of pendingAuctions) {
            auction.status = auction_entity_1.AuctionStatus.ACTIVE;
            await this.auctionRepo.save(auction);
        }
        if (pendingAuctions.length > 0) {
            console.log(`[Cron] Activated ${pendingAuctions.length} pending auctions`);
        }
    }
    async endExpiredAuctions() {
        const now = new Date();
        const expiredAuctions = await this.auctionRepo.find({
            where: {
                status: auction_entity_1.AuctionStatus.ACTIVE,
                endTime: (0, typeorm_2.LessThanOrEqual)(now)
            }
        });
        for (const auction of expiredAuctions) {
            auction.status = auction_entity_1.AuctionStatus.ENDED;
            if (auction.bidCount > 0) {
                const highestBid = await this.bidRepo.findOne({
                    where: { auctionId: auction.id },
                    order: { amount: 'DESC' }
                });
                auction.winnerId = highestBid?.bidderId;
            }
            await this.auctionRepo.save(auction);
        }
        if (expiredAuctions.length > 0) {
            console.log(`[Cron] Ended ${expiredAuctions.length} expired auctions`);
        }
    }
    async findAll(filters) {
        const queryBuilder = this.auctionRepo
            .createQueryBuilder('auction')
            .leftJoinAndSelect('auction.product', 'product')
            .leftJoinAndSelect('auction.seller', 'seller');
        if (filters.sellerId) {
            queryBuilder.where('auction.sellerId = :sellerId', { sellerId: filters.sellerId });
        }
        else {
            queryBuilder.where('auction.status IN (:...statuses)', {
                statuses: [auction_entity_1.AuctionStatus.ACTIVE, auction_entity_1.AuctionStatus.ENDED]
            });
        }
        if (filters.category?.length) {
            queryBuilder.andWhere('product.category IN (:...categories)', { categories: filters.category });
        }
        if (filters.rarity?.length) {
            queryBuilder.andWhere('product.rarity IN (:...rarities)', { rarities: filters.rarity });
        }
        if (filters.status) {
            queryBuilder.andWhere('auction.status = :status', { status: filters.status });
        }
        if (filters.priceMin) {
            queryBuilder.andWhere('auction.currentPrice >= :priceMin', { priceMin: filters.priceMin });
        }
        if (filters.priceMax) {
            queryBuilder.andWhere('auction.currentPrice <= :priceMax', { priceMax: filters.priceMax });
        }
        if (filters.search) {
            queryBuilder.andWhere('(product.titleEn LIKE :search OR product.titleZh LIKE :search)', { search: `%${filters.search}%` });
        }
        switch (filters.sortBy) {
            case 'endingSoon':
                queryBuilder.orderBy('auction.endTime', 'ASC');
                break;
            case 'priceAsc':
                queryBuilder.orderBy('auction.currentPrice', 'ASC');
                break;
            case 'priceDesc':
                queryBuilder.orderBy('auction.currentPrice', 'DESC');
                break;
            case 'mostBids':
                queryBuilder.orderBy('auction.bidCount', 'DESC');
                break;
            default:
                queryBuilder.orderBy(filters.sellerId ? 'auction.createdAt' : 'auction.endTime', 'DESC');
        }
        const page = filters.page || 1;
        const limit = filters.limit || 20;
        queryBuilder.skip((page - 1) * limit).take(limit);
        const [data, total] = await queryBuilder.getManyAndCount();
        return {
            data,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
        };
    }
    async findOne(id) {
        const auction = await this.auctionRepo.findOne({
            where: { id },
            relations: ['product', 'seller', 'bids', 'bids.bidder']
        });
        if (!auction) {
            throw new common_1.NotFoundException('Auction not found');
        }
        return auction;
    }
    async create(dto, userId) {
        const product = await this.productRepo.findOne({
            where: { id: dto.productId }
        });
        if (!product) {
            throw new common_1.NotFoundException('Product not found');
        }
        if (product.sellerId !== userId) {
            throw new common_1.ForbiddenException('You can only create auctions for your own products');
        }
        const auction = this.auctionRepo.create({
            productId: dto.productId,
            sellerId: userId,
            startingPrice: dto.startingPrice,
            currentPrice: dto.startingPrice,
            reservePrice: dto.reservePrice,
            buyNowPrice: dto.buyNowPrice,
            startTime: dto.startTime ? new Date(dto.startTime) : new Date(),
            endTime: dto.endTime ? new Date(dto.endTime) : new Date(Date.now() + (dto.durationHours || 24) * 60 * 60 * 1000),
            extensionMinutes: dto.extensionMinutes || 5,
            status: auction_entity_1.AuctionStatus.PENDING
        });
        await this.auctionRepo.save(auction);
        if (new Date(dto.startTime) <= new Date()) {
            auction.status = auction_entity_1.AuctionStatus.ACTIVE;
            await this.auctionRepo.save(auction);
        }
        product.status = product_entity_1.ProductStatus.ACTIVE;
        await this.productRepo.save(product);
        return auction;
    }
    async placeBid(auctionId, amount, userId) {
        const auction = await this.findOne(auctionId);
        if (auction.sellerId === userId) {
            throw new common_1.ForbiddenException('Sellers cannot bid on their own auctions');
        }
        if (auction.winnerId === userId) {
            throw new common_1.BadRequestException('You are already the highest bidder');
        }
        if (auction.status !== auction_entity_1.AuctionStatus.ACTIVE) {
            throw new common_1.BadRequestException('Auction is not active');
        }
        const now = new Date();
        if (now < auction.startTime) {
            throw new common_1.BadRequestException('Auction has not started yet');
        }
        if (now > auction.endTime) {
            throw new common_1.BadRequestException('Auction has ended');
        }
        if (amount <= auction.currentPrice) {
            throw new common_1.BadRequestException(`Bid must be higher than current price: HK$${auction.currentPrice}`);
        }
        const bid = this.bidRepo.create({
            auctionId,
            bidderId: userId,
            amount
        });
        await this.bidRepo.save(bid);
        const updateData = {
            currentPrice: amount,
            bidCount: auction.bidCount + 1,
            winnerId: userId
        };
        const timeLeft = auction.endTime.getTime() - now.getTime();
        const extensionThreshold = 5 * 60 * 1000;
        if (timeLeft < extensionThreshold) {
            updateData.endTime = new Date(now.getTime() + auction.extensionMinutes * 60 * 1000);
        }
        await this.auctionRepo.update(auctionId, updateData);
        const updatedAuction = await this.auctionRepo.findOne({ where: { id: auctionId } });
        return {
            bid,
            auction: {
                currentPrice: updatedAuction.currentPrice,
                endTime: updatedAuction.endTime,
                bidCount: updatedAuction.bidCount
            }
        };
    }
    async cancel(auctionId, userId) {
        const auction = await this.findOne(auctionId);
        if (auction.sellerId !== userId) {
            throw new common_1.ForbiddenException('Only the seller can cancel the auction');
        }
        if (auction.bidCount > 0) {
            throw new common_1.BadRequestException('Cannot cancel auction with existing bids');
        }
        auction.status = auction_entity_1.AuctionStatus.CANCELLED;
        await this.auctionRepo.save(auction);
        return auction;
    }
    async endAuction(auctionId) {
        const auction = await this.findOne(auctionId);
        if (auction.status !== auction_entity_1.AuctionStatus.ACTIVE) {
            return auction;
        }
        auction.status = auction_entity_1.AuctionStatus.ENDED;
        if (auction.bidCount > 0) {
            const highestBid = await this.bidRepo.findOne({
                where: { auctionId },
                order: { amount: 'DESC' }
            });
            auction.winnerId = highestBid.bidderId;
        }
        await this.auctionRepo.save(auction);
        if (auction.winnerId) {
            const product = await this.productRepo.findOne({ where: { id: auction.productId } });
            if (product) {
                product.status = product_entity_1.ProductStatus.SOLD;
                await this.productRepo.save(product);
            }
        }
        return auction;
    }
};
exports.AuctionsService = AuctionsService;
__decorate([
    (0, schedule_1.Cron)('* * * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AuctionsService.prototype, "activatePendingAuctions", null);
__decorate([
    (0, schedule_1.Cron)('* * * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AuctionsService.prototype, "endExpiredAuctions", null);
exports.AuctionsService = AuctionsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(auction_entity_1.Auction)),
    __param(1, (0, typeorm_1.InjectRepository)(auction_entity_1.Bid)),
    __param(2, (0, typeorm_1.InjectRepository)(product_entity_1.Product)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], AuctionsService);
//# sourceMappingURL=auctions.service.js.map