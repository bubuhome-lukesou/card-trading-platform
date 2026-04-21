import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, LessThanOrEqual, MoreThanOrEqual, Not } from 'typeorm'
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

  async findAll(filters: AuctionFiltersDto) {
    const queryBuilder = this.auctionRepo
      .createQueryBuilder('auction')
      .leftJoinAndSelect('auction.product', 'product')
      .leftJoinAndSelect('auction.seller', 'seller')
      .where('auction.status IN (:...statuses)', {
        statuses: [AuctionStatus.ACTIVE, AuctionStatus.ENDED]
      })

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
        '(product.titleEn ILIKE :search OR product.titleZh ILIKE :search)',
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
        queryBuilder.orderBy('auction.endTime', 'ASC')
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
    const auction = await this.auctionRepo.findOne({
      where: { id },
      relations: ['product', 'seller', 'bids', 'bids.bidder']
    })

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
      startTime: new Date(dto.startTime),
      endTime: new Date(dto.endTime),
      extensionMinutes: dto.extensionMinutes || 5,
      status: AuctionStatus.PENDING
    })

    await this.auctionRepo.save(auction)

    // Update product status
    product.listingType = 'auction' as any
    product.status = ProductStatus.ACTIVE
    await this.productRepo.save(product)

    return auction
  }

  async placeBid(auctionId: string, amount: number, userId: string) {
    const auction = await this.findOne(auctionId)

    if (auction.sellerId === userId) {
      throw new ForbiddenException('Sellers cannot bid on their own auctions')
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

    // Create bid
    const bid = this.bidRepo.create({
      auctionId,
      bidderId: userId,
      amount
    })
    await this.bidRepo.save(bid)

    // Update auction
    auction.currentPrice = amount
    auction.bidCount++

    // Bid extension: if bid placed within last 5 minutes, extend by extensionMinutes
    const timeLeft = auction.endTime.getTime() - now.getTime()
    const extensionThreshold = 5 * 60 * 1000 // 5 minutes in ms

    if (timeLeft < extensionThreshold) {
      auction.endTime = new Date(now.getTime() + auction.extensionMinutes * 60 * 1000)
    }

    await this.auctionRepo.save(auction)

    return {
      bid,
      auction: {
        currentPrice: auction.currentPrice,
        endTime: auction.endTime,
        bidCount: auction.bidCount
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
