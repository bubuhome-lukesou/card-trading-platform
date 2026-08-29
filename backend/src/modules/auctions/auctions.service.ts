import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, LessThanOrEqual, MoreThanOrEqual, Not } from 'typeorm'
import { Cron } from '@nestjs/schedule'
import { Auction, AuctionStatus, Bid } from '../../entities/auction.entity'
import { Product, ProductStatus } from '../../entities/product.entity'
import { CreateAuctionDto, AuctionFiltersDto } from './dto/auction.dto'

@Injectable()
export class AuctionsService {
  constructor(
    @InjectRepository(Auction)
    private readonly auctionRepo: Repository<Auction>,
    @InjectRepository(Bid)
    private readonly bidRepo: Repository<Bid>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>
  ) {}

  // Cron job to activate pending auctions every minute
  @Cron('* * * * *')
  async activatePendingAuctions() {
    const now = new Date()
    const pendingAuctions = await this.auctionRepo.find({
      where: {
        status: AuctionStatus.PENDING,
        startTime: LessThanOrEqual(now)
      }
    })

    for (const auction of pendingAuctions) {
      auction.status = AuctionStatus.ACTIVE
      await this.auctionRepo.save(auction)
    }

    if (pendingAuctions.length > 0) {
      console.log(`[Cron] Activated ${pendingAuctions.length} pending auctions`)
    }
  }

  // Cron job to end expired auctions every minute
  @Cron('* * * * *')
  async endExpiredAuctions() {
    const now = new Date()
    const expiredAuctions = await this.auctionRepo.find({
      where: {
        status: AuctionStatus.ACTIVE,
        endTime: LessThanOrEqual(now)
      }
    })

    for (const auction of expiredAuctions) {
      auction.status = AuctionStatus.ENDED
      if (auction.bidCount > 0) {
        const highestBid = await this.bidRepo.findOne({
          where: { auctionId: auction.id },
          order: { amount: 'DESC' }
        })
        auction.winnerId = highestBid?.bidderId
      }
      await this.auctionRepo.save(auction)
    }

    if (expiredAuctions.length > 0) {
      console.log(`[Cron] Ended ${expiredAuctions.length} expired auctions`)
    }
  }

  async findAll(filters: AuctionFiltersDto) {
    const queryBuilder = this.auctionRepo
      .createQueryBuilder('auction')
      .leftJoinAndSelect('auction.product', 'product')
      .leftJoinAndSelect('auction.seller', 'seller')

    // Seller view: show all statuses; public view: only active/ended
    if (filters.sellerId) {
      queryBuilder.where('auction.sellerId = :sellerId', { sellerId: filters.sellerId })
    } else {
      queryBuilder.where('auction.status IN (:...statuses)', {
        statuses: [AuctionStatus.ACTIVE, AuctionStatus.ENDED]
      })
    }

    if (filters.category?.length) {
      queryBuilder.andWhere('product.category IN (:...categories)', { categories: filters.category })
    }
    if (filters.rarity?.length) {
      queryBuilder.andWhere('product.rarity IN (:...rarities)', { rarities: filters.rarity })
    }
    if (filters.status) {
      queryBuilder.andWhere('auction.status = :status', { status: filters.status })
    }
    if (filters.priceMin) {
      queryBuilder.andWhere('auction.currentPrice >= :priceMin', { priceMin: filters.priceMin })
    }
    if (filters.priceMax) {
      queryBuilder.andWhere('auction.currentPrice <= :priceMax', { priceMax: filters.priceMax })
    }
    if (filters.search) {
      queryBuilder.andWhere(
        '(product.titleEn LIKE :search OR product.titleZh LIKE :search)',
        { search: `%${filters.search}%` }
      )
    }

    // Sorting
    switch (filters.sortBy) {
      case 'endingSoon':
        queryBuilder.orderBy('auction.endTime', 'ASC')
        break
      case 'priceAsc':
        queryBuilder.orderBy('auction.currentPrice', 'ASC')
        break
      case 'priceDesc':
        queryBuilder.orderBy('auction.currentPrice', 'DESC')
        break
      case 'mostBids':
        queryBuilder.orderBy('auction.bidCount', 'DESC')
        break
      default:
        // Seller view defaults to newest first
        queryBuilder.orderBy(filters.sellerId ? 'auction.createdAt' : 'auction.endTime', 'DESC')
    }

    const page = filters.page || 1
    const limit = filters.limit || 20
    queryBuilder.skip((page - 1) * limit).take(limit)

    const [data, total] = await queryBuilder.getManyAndCount()

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
    }
  }

  async findOne(id: string) {
    const auction = await this.auctionRepo
      .createQueryBuilder('auction')
      .leftJoinAndSelect('auction.product', 'product')
      .leftJoinAndSelect('auction.seller', 'seller')
      .leftJoinAndSelect('auction.bids', 'bid', 'bid.status = :status', { status: 'active' })
      .leftJoinAndSelect('bid.bidder', 'bidder')
      .where('auction.id = :id', { id })
      .orderBy('bid.amount', 'DESC')
      .addOrderBy('bid.createdAt', 'DESC')
      .getOne()

    if (!auction) {
      throw new NotFoundException('Auction not found')
    }

    return auction
  }

  async create(dto: CreateAuctionDto, userId: string) {
    const product = await this.productRepo.findOne({
      where: { id: dto.productId }
    })

    if (!product) {
      throw new NotFoundException('Product not found')
    }

    if (product.sellerId !== userId) {
      throw new ForbiddenException('You can only create auctions for your own products')
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
      status: AuctionStatus.PENDING
    })

    await this.auctionRepo.save(auction)

    // Immediately activate if startTime has passed
    if (new Date(dto.startTime) <= new Date()) {
      auction.status = AuctionStatus.ACTIVE;
      await this.auctionRepo.save(auction);
    }

    // Update product status
    product.status = ProductStatus.ACTIVE
    await this.productRepo.save(product)

    return auction
  }

  async placeBid(auctionId: string, amount: number, userId: string) {
    // Retry loop handles concurrent bid races via optimistic locking
    const maxRetries = 3
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      // Always fetch fresh auction state inside the loop
      const auction = await this.auctionRepo.findOne({
        where: { id: auctionId },
        relations: ['product', 'seller']
      })

      if (!auction) {
        throw new NotFoundException('Auction not found')
      }

      if (auction.sellerId === userId) {
        throw new ForbiddenException('Sellers cannot bid on their own auctions')
      }

      // Prevent highest bidder from bidding again
      if (auction.winnerId === userId) {
        throw new BadRequestException('You are already the highest bidder')
      }

      if (auction.status !== AuctionStatus.ACTIVE) {
        throw new BadRequestException('Auction is not active')
      }

      const now = new Date()
      if (now < auction.startTime) {
        throw new BadRequestException('Auction has not started yet')
      }
      if (now > auction.endTime) {
        throw new BadRequestException('Auction has ended')
      }

      // Check if bid is higher than current price
      if (amount <= auction.currentPrice) {
        throw new BadRequestException(`Bid must be higher than current price: HK$${auction.currentPrice}`)
      }

      // --- Optimistic lock: only update if currentPrice hasn't changed ---
      // This prevents two concurrent bids at the same price from both succeeding
      const result = await this.auctionRepo
        .createQueryBuilder()
        .update(Auction)
        .set({
          currentPrice: amount,
          bidCount: () => 'bidCount + 1',  // atomic increment
          winnerId: userId,
          endTime: (() => {
            const timeLeft = auction.endTime.getTime() - now.getTime()
            const extensionThreshold = 5 * 60 * 1000
            if (timeLeft < extensionThreshold) {
              return new Date(now.getTime() + auction.extensionMinutes * 60 * 1000)
            }
            return auction.endTime
          })()
        })
        .where('id = :id AND currentPrice = :expectedPrice', {
          id: auctionId,
          expectedPrice: auction.currentPrice
        })
        .execute()

      // If no rows were updated, another bid beat us — retry with fresh state
      if (result.affected === 0) {
        if (attempt < maxRetries - 1) {
          continue  // retry: re-read auction and re-validate
        }
        // Final attempt failed — another bidder placed a higher bid concurrently
        const refreshed = await this.auctionRepo.findOne({ where: { id: auctionId } })
        throw new BadRequestException(
          `Another bid was placed simultaneously. Current price is now HK$${refreshed?.currentPrice}. Please try again with a higher bid.`
        )
      }

      // Auction updated successfully — now save the bid record
      const bid = this.bidRepo.create({
        auctionId,
        bidderId: userId,
        amount
      })
      await this.bidRepo.save(bid)

      // Reload to get final state
      const updatedAuction = await this.auctionRepo.findOne({ where: { id: auctionId } })

      return {
        bid,
        auction: {
          currentPrice: updatedAuction.currentPrice,
          endTime: updatedAuction.endTime,
          bidCount: updatedAuction.bidCount
        }
      }
    }
  }

  async cancel(auctionId: string, userId: string) {
    const auction = await this.findOne(auctionId)

    if (auction.sellerId !== userId) {
      throw new ForbiddenException('Only the seller can cancel the auction')
    }

    if (auction.bidCount > 0) {
      throw new BadRequestException('Cannot cancel auction with existing bids')
    }

    auction.status = AuctionStatus.CANCELLED
    await this.auctionRepo.save(auction)

    return auction
  }

  async endAuction(auctionId: string) {
    const auction = await this.findOne(auctionId)

    if (auction.status !== AuctionStatus.ACTIVE) {
      return auction
    }

    auction.status = AuctionStatus.ENDED

    // Find highest bidder
    if (auction.bidCount > 0) {
      const highestBid = await this.bidRepo.findOne({
        where: { auctionId },
        order: { amount: 'DESC' }
      })
      auction.winnerId = highestBid.bidderId
    }

    await this.auctionRepo.save(auction)

    // Update product status
    if (auction.winnerId) {
      const product = await this.productRepo.findOne({ where: { id: auction.productId } })
      if (product) {
        product.status = ProductStatus.SOLD
        await this.productRepo.save(product)
      }
    }

    return auction
  }
}

