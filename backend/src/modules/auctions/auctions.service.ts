import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, LessThanOrEqual, MoreThanOrEqual, Not, In, DataSource } from 'typeorm'
import { Cron } from '@nestjs/schedule'
import { Auction, AuctionStatus, Bid } from '../../entities/auction.entity'
import { BidStatus } from '../../entities/bid.entity'
import { Product, ProductStatus } from '../../entities/product.entity'
import { Order, OrderType, OrderStatus } from '../../entities/order.entity'
import { CreateAuctionDto, AuctionFiltersDto } from './dto/auction.dto'
import { AuctionGateway } from '../../websocket/websocket.gateway'
import { NotificationService } from '../notification/notification.service'
import { NotificationType } from '../../entities/notification.entity'

@Injectable()
export class AuctionsService {
  constructor(
    @InjectRepository(Auction)
    private readonly auctionRepo: Repository<Auction>,
    @InjectRepository(Bid)
    private readonly bidRepo: Repository<Bid>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    private readonly dataSource: DataSource,
    private readonly auctionGateway: AuctionGateway,
    private readonly notificationService: NotificationService,
  ) {}

  // Effective status: time-based truth at read time — DB status is only the
  // persisted result the cron finalizes. A PENDING auction whose startTime has
  // passed reports ACTIVE; an ACTIVE auction past endTime reports ENDED
  // (side effects: winner/orders/WS still handled by cron, ≤60s later).
  private effectiveStatus(a: Auction, now = new Date()): AuctionStatus {
    if (a.status === AuctionStatus.CANCELLED) return a.status
    if (a.status === AuctionStatus.PENDING && a.startTime <= now) return AuctionStatus.ACTIVE
    if (a.status === AuctionStatus.ACTIVE && a.endTime <= now) return AuctionStatus.ENDED
    return a.status
  }

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

  // 🔔 Cron：拍賣將結束通知（剩 ≤10 分鐘、有出價、未通知過）— 每場拍賣只通知一次
  @Cron('* * * * *')
  async notifyAuctionEnding() {
    const now = new Date()
    const tenMinLater = new Date(now.getTime() + 10 * 60 * 1000)
    const elevenMinLater = new Date(now.getTime() + 11 * 60 * 1000)

    try {
      // ACTIVE + endTime 落喺 (now, now+10min] 區間 + 尚未通知過
      const endingAuctions = await this.auctionRepo.find({
        where: {
          status: AuctionStatus.ACTIVE,
          endingNotified: false,
          endTime: LessThanOrEqual(tenMinLater),
        },
        relations: ['product'],
      })

      for (const auction of endingAuctions) {
        // endTime 必須未過（否則留俾 endExpiredAuctions 處理）
        if (auction.endTime <= now) continue

        // 只通知有出價者嘅拍賣；冇出價冇競爭，唔使催
        if (auction.bidCount <= 0) {
          continue
        }

        const productTitle = auction.product?.titleZh || auction.product?.titleEn || '拍賣商品'
        const minutesLeft = Math.max(1, Math.ceil((auction.endTime.getTime() - now.getTime()) / 60000))

        // 所有出價過嘅人（DISTINCT，避免同一人多次出價收到多條）
        const bidders = await this.bidRepo
          .createQueryBuilder('bid')
          .select('DISTINCT bid.bidderId', 'bidderId')
          .where('bid.auctionId = :auctionId', { auctionId: auction.id })
          .getRawMany()

        for (const row of bidders) {
          await this.notificationService.notify({
            userId: row.bidderId,
            type: NotificationType.AUCTION_ENDING,
            title: '拍賣即將結束',
            message: `「${productTitle}」拍賣將於 ${minutesLeft} 分鐘後結束，目前最高價 MOP $${auction.currentPrice}，把握最後機會！`,
            link: `/auction/${auction.id}`,
          })
        }

        // 賣家：知自己拍賣就嚟結算
        await this.notificationService.notify({
          userId: auction.sellerId,
          type: NotificationType.AUCTION_ENDING,
          title: '您的拍賣即將結束',
          message: `「${productTitle}」將於 ${minutesLeft} 分鐘後結束，目前最高價 MOP $${auction.currentPrice}`,
          link: `/auction/${auction.id}`,
        })

        // 標記已通知（先 atomic 更新再繼續，防止 cron 重啟重複發送）
        await this.auctionRepo
          .createQueryBuilder()
          .update(Auction)
          .set({ endingNotified: true })
          .where('id = :id AND endingNotified = :flag', { id: auction.id, flag: false })
          .execute()
      }

      if (endingAuctions.length > 0) {
        console.log(`[Cron] Sent ending-soon notifications for ${endingAuctions.length} auctions`)
      }
    } catch (err) {
      console.error('[Cron] notifyAuctionEnding failed:', err)
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
      try {
        // A10: Atomic status update first — prevents reprocessing if cron restarts mid-loop
        const updateResult = await this.auctionRepo
          .createQueryBuilder()
          .update(Auction)
          .set({ status: AuctionStatus.ENDED })
          .where('id = :id AND status = :status', { id: auction.id, status: AuctionStatus.ACTIVE })
          .execute()
        if (updateResult.affected === 0) continue // Already processed by another instance

        auction.status = AuctionStatus.ENDED
        if (auction.bidCount > 0) {
          const highestBid = await this.bidRepo.findOne({
            where: { auctionId: auction.id },
            order: { amount: 'DESC' }
          })
          // Check reserve price — if not met, flow back (no winner)
          if (auction.reservePrice && Number(highestBid?.amount) < Number(auction.reservePrice)) {
            auction.winnerId = null
          } else {
            auction.winnerId = highestBid?.bidderId ?? null
          }
        }
        await this.auctionRepo.save(auction)

        // A11: Mark bid statuses (WON for winner, OUTBID for others)
        await this.markBidStatuses(auction)

        // If there's a winner, create AUCTION_WIN order and mark product SOLD
        if (auction.winnerId) {
          await this.createAuctionWinOrder(auction)
          const product = await this.productRepo.findOne({ where: { id: auction.productId } })
          if (product) {
            product.status = ProductStatus.SOLD
            await this.productRepo.save(product)
          }
        } else {
          // A1: No winner (no bids or reserve not met) — restore product to ACTIVE for re-sale
          const product = await this.productRepo.findOne({ where: { id: auction.productId } })
          if (product && product.status !== ProductStatus.SOLD) {
            product.status = ProductStatus.ACTIVE
            await this.productRepo.save(product)
          }
        }
        
        // A3: Broadcast auction end via WebSocket
        try {
          this.auctionGateway.broadcastAuctionEnd(auction.id, {
            id: auction.winnerId || '',
            name: '',
            finalPrice: Number(auction.currentPrice),
          })
        } catch (e) {
          console.error('[Auction] WebSocket broadcastAuctionEnd failed:', e)
        }
      } catch (err) {
        console.error(`[Cron] Error ending auction ${auction.id}:`, err)
      }
    }

    if (expiredAuctions.length > 0) {
      console.log(`[Cron] Ended ${expiredAuctions.length} expired auctions`)
    }
  }

  // A11: Mark bid statuses when an auction ends — winner's bid → WON, others → OUTBID
  // (bids that were never the highest stay OUTBID; if no winner/reserve not met, all stay OUTBID)
  private async markBidStatuses(auction: Auction) {
    try {
      if (auction.winnerId) {
        // Mark the winning bid as WON
        await this.bidRepo
          .createQueryBuilder()
          .update(Bid)
          .set({ status: BidStatus.WON })
          .where(
            'auctionId = :auctionId AND bidderId = :bidderId AND amount = :amount',
            { auctionId: auction.id, bidderId: auction.winnerId, amount: auction.currentPrice }
          )
          .execute()
      }
      // All remaining ACTIVE bids become OUTBID
      await this.bidRepo
        .createQueryBuilder()
        .update(Bid)
        .set({ status: BidStatus.OUTBID })
        .where('auctionId = :auctionId AND status = :status', {
          auctionId: auction.id,
          status: BidStatus.ACTIVE,
        })
        .execute()
    } catch (e) {
      // Non-fatal: status marking is cosmetic — log and continue
      console.error(`[Auction] markBidStatuses failed for ${auction.id}:`, e)
    }
  }

  // Create an AUCTION_WIN order for the auction winner
  private async createAuctionWinOrder(auction: Auction) {
    const orderNumber = 'AUC-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase()
    const order = this.orderRepo.create({
      orderNumber,
      buyerId: auction.winnerId,
      sellerId: auction.sellerId,
      productId: auction.productId,
      type: OrderType.AUCTION_WIN,
      status: OrderStatus.PENDING,
      totalPrice: auction.currentPrice,
      quantity: 1,
      shippingCost: 0,
      platformFee: 0,
      notes: `拍賣成交 - Auction ID: ${auction.id}`,
    })
    return this.orderRepo.save(order)
  }

  async findAll(filters: AuctionFiltersDto) {
    const queryBuilder = this.auctionRepo
      .createQueryBuilder('auction')
      .leftJoinAndSelect('auction.product', 'product')
      .leftJoinAndSelect('auction.seller', 'seller')

    // Seller view: show all statuses; public view: all non-cancelled
    // (effective status is computed after fetch — a DB-active auction past
    // endTime must be available for the 'ended' filter, and a DB-pending
    // auction past startTime must show as active without waiting for cron)
    if (filters.sellerId) {
      queryBuilder.where('auction.sellerId = :sellerId', { sellerId: filters.sellerId })
    } else {
      queryBuilder.where('auction.status IN (:...statuses)', {
        statuses: [AuctionStatus.ACTIVE, AuctionStatus.PENDING, AuctionStatus.ENDED]
      })
    }

    if (filters.category?.length) {
      queryBuilder.andWhere('product.category IN (:...categories)', { categories: filters.category })
    }
    // filters.status is applied AFTER effective-status mapping below
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

    // hideEnded is applied AFTER effective-status mapping below

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

    // Effective status mapping + post-filters (status / hideEnded) on the
    // time-derived truth, so users never see stale cron-delayed statuses.
    const now = new Date()
    let mapped = data.map(auction => {
      auction.status = this.effectiveStatus(auction, now)
      return auction
    })
    if (filters.status) {
      mapped = mapped.filter(a => a.status === filters.status)
    }
    if (filters.hideEnded) {
      mapped = mapped.filter(
        a => a.status === AuctionStatus.ACTIVE || a.status === AuctionStatus.PENDING
      )
    }
    // Public view: hide anything still CANCELLED in DB (never mapped)
    if (!filters.sellerId) {
      mapped = mapped.filter(a => a.status !== AuctionStatus.CANCELLED)
    }

    return {
      data: mapped,
      meta: { total: mapped.length, page, limit, totalPages: Math.max(1, Math.ceil(mapped.length / limit)) }
    }
  }

  // Find auction by productId (returns latest active/pending/ended auction)
  async findByProductId(productId: string) {
    const auction = await this.auctionRepo
      .createQueryBuilder('auction')
      .leftJoinAndSelect('auction.product', 'product')
      .where('auction.productId = :productId', { productId })
      .orderBy('auction.createdAt', 'DESC')
      .getOne()

    if (!auction) {
      throw new NotFoundException('No auction found for this product')
    }

    auction.status = this.effectiveStatus(auction)
    return auction
  }

  async findOne(id: string) {
    const auction = await this.auctionRepo
      .createQueryBuilder('auction')
      .leftJoinAndSelect('auction.product', 'product')
      .leftJoinAndSelect('auction.seller', 'seller')
      .leftJoinAndSelect('auction.bids', 'bid')
      .leftJoinAndSelect('bid.bidder', 'bidder')
      .where('auction.id = :id', { id })
      .orderBy('bid.amount', 'DESC')
      .addOrderBy('bid.createdAt', 'DESC')
      .getOne()

    if (!auction) {
      throw new NotFoundException('Auction not found')
    }

    auction.status = this.effectiveStatus(auction)
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

    // A2: Validate product status — must be ACTIVE or DRAFT (not SOLD/CANCELLED/REMOVED)
    if (product.status === ProductStatus.SOLD || product.status === ProductStatus.CANCELLED || product.status === ProductStatus.REMOVED) {
      throw new BadRequestException(`Cannot create auction for a product with status: ${product.status}`)
    }

    // A2: Check no existing active/pending auction for this product
    const existingAuction = await this.auctionRepo.findOne({
      where: { productId: dto.productId, status: AuctionStatus.ACTIVE }
    })
    if (existingAuction) {
      throw new BadRequestException('This product already has an active auction')
    }
    const existingPending = await this.auctionRepo.findOne({
      where: { productId: dto.productId, status: AuctionStatus.PENDING }
    })
    if (existingPending) {
      throw new BadRequestException('This product already has a pending auction')
    }

    // Truncate to whole seconds — MySQL DATETIME rounds sub-second precision UP,
    // which makes startTime 1s in the future and rejects immediate bids.
    const nowSec = new Date(Math.floor(Date.now() / 1000) * 1000)
    const startTime = dto.startTime ? new Date(dto.startTime) : nowSec

    // 直購價必須高於起拍價（有設先檢查）
    if (dto.buyNowPrice !== undefined && dto.buyNowPrice !== null && Number(dto.buyNowPrice) > 0) {
      if (Number(dto.buyNowPrice) <= Number(dto.startingPrice)) {
        throw new BadRequestException('直購價必須高於起拍價')
      }
    }

    const auction = this.auctionRepo.create({
      productId: dto.productId,
      sellerId: userId,
      startingPrice: dto.startingPrice,
      currentPrice: dto.startingPrice,
      reservePrice: dto.reservePrice,
      buyNowPrice: dto.buyNowPrice,
      startTime,
      endTime: dto.endTime ? new Date(dto.endTime) : new Date(Date.now() + (dto.durationHours || 24) * 60 * 60 * 1000),
      extensionMinutes: dto.extensionMinutes || 5,
      // Activate immediately when startTime is now or in the past (avoids up-to-60s PENDING gap)
      status: startTime <= new Date() ? AuctionStatus.ACTIVE : AuctionStatus.PENDING
    })

    await this.auctionRepo.save(auction)

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

      // Highest bidder cannot bid again — must wait for others to outbid
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
        throw new BadRequestException(`Bid must be higher than current price: MOP $${auction.currentPrice}`)
      }

      // --- A5: Wrap auction update + bid record in a single DB transaction ---
      // Optimistic lock (currentPrice unchanged) still guards the race; the
      // transaction guarantees the bid record never diverges from the auction state.
      const queryRunner = this.dataSource.createQueryRunner()
      await queryRunner.connect()
      await queryRunner.startTransaction()

      try {
        const result = await queryRunner.manager
          .createQueryBuilder()
          .update(Auction)
          .set({
            currentPrice: amount,
            bidCount: () => 'bidCount + 1',  // atomic increment
            winnerId: userId,
            endTime: (() => {
              const timeLeft = auction.endTime.getTime() - now.getTime()
              // U5: Use extensionMinutes for both threshold and extension duration
              const extMs = (auction.extensionMinutes || 5) * 60 * 1000
              if (timeLeft < extMs) {
                return new Date(now.getTime() + extMs)
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
          await queryRunner.rollbackTransaction()
          if (attempt < maxRetries - 1) {
            continue  // retry: re-read auction and re-validate
          }
          // Final attempt failed — another bidder placed a higher bid concurrently
          const refreshed = await this.auctionRepo.findOne({ where: { id: auctionId } })
          throw new BadRequestException(
            `Another bid was placed simultaneously. Current price is now MOP $${refreshed?.currentPrice}. Please try again with a higher bid.`
          )
        }

        // A11: Mark previous active bids from other bidders as OUTBID (inside txn)
        await queryRunner.manager
          .createQueryBuilder()
          .update(Bid)
          .set({ status: BidStatus.OUTBID })
          .where('auctionId = :auctionId AND bidderId != :userId AND status = :status', {
            auctionId,
            userId,
            status: BidStatus.ACTIVE,
          })
          .execute()

        // Save the new bid record (inside txn)
        const bid = queryRunner.manager.create(Bid, {
          auctionId,
          bidderId: userId,
          amount,
          status: BidStatus.ACTIVE,
        })
        const savedBid = await queryRunner.manager.save(bid)

        await queryRunner.commitTransaction()

        // Reload to get final state
        const updatedAuction = await this.auctionRepo.findOne({ where: { id: auctionId } })

        // 🔔 站內通知：被出局者 + 賣家收到新出價（不阻塞出價主流程）
        try {
          const outbidBidders = await this.bidRepo
            .createQueryBuilder('bid')
            .select('DISTINCT bid.bidderId', 'bidderId')
            .where('bid.auctionId = :auctionId AND bid.bidderId != :userId AND bid.status = :status', {
              auctionId, userId, status: BidStatus.OUTBID,
            })
            .getRawMany()
          const productTitle = auction.product?.titleZh || auction.product?.titleEn || '拍賣商品'
          for (const row of outbidBidders) {
            await this.notificationService.notify({
              userId: row.bidderId,
              type: NotificationType.OUTBID,
              title: '出價被超越',
              message: `您在「${productTitle}」的出價已被超越，目前最高價 MOP $${amount}`,
              link: `/auction/${auctionId}`,
            })
          }
          // 賣家通知：收到新出價
          await this.notificationService.notify({
            userId: auction.sellerId,
            type: NotificationType.NEW_BID,
            title: '拍賣收到新出價',
            message: `「${productTitle}」收到新出價 MOP $${amount}`,
            link: `/auction/${auctionId}`,
          })
        } catch (e) {
          console.error('[Auction] Notification failed (non-fatal):', e)
        }

        // A3: Broadcast new bid via WebSocket to all clients in the auction room
        try {
          this.auctionGateway.broadcastBid(auctionId, {
            id: savedBid.id,
            amount: Number(savedBid.amount),
            bidderId: savedBid.bidderId,
            bidderName: '', // name not needed on frontend, it fetches bidder details
            timestamp: savedBid.createdAt,
          })
        } catch (e) {
          // WebSocket broadcast failure should not block the bid
          console.error('[Auction] WebSocket broadcastBid failed:', e)
        }

        return {
          bid: savedBid,
          auction: {
            currentPrice: updatedAuction?.currentPrice ?? amount,
            endTime: updatedAuction?.endTime ?? auction.endTime,
            bidCount: updatedAuction?.bidCount ?? (auction.bidCount + 1)
          }
        }
      } catch (err) {
        await queryRunner.rollbackTransaction()
        throw err
      } finally {
        await queryRunner.release()
      }
    }
  }

  async cancel(auctionId: string, userId: string) {
    const auction = await this.findOne(auctionId)

    if (auction.sellerId !== userId) {
      throw new ForbiddenException('Only the seller can cancel the auction')
    }

    // A7: Check auction status — can only cancel PENDING or ACTIVE auctions
    if (auction.status === AuctionStatus.ENDED || auction.status === AuctionStatus.CANCELLED) {
      throw new BadRequestException(`Cannot cancel auction with status: ${auction.status}`)
    }

    if (auction.bidCount > 0) {
      throw new BadRequestException('Cannot cancel auction with existing bids')
    }

    auction.status = AuctionStatus.CANCELLED
    await this.auctionRepo.save(auction)

    // Restore product to ACTIVE if it was set to ACTIVE for the auction
    const product = await this.productRepo.findOne({ where: { id: auction.productId } })
    if (product && product.status === ProductStatus.ACTIVE) {
      // Keep as ACTIVE so seller can re-list — don't change to SOLD/CANCELLED
    }

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
      // Check reserve price — if not met, flow back (no winner)
      if (auction.reservePrice && Number(highestBid?.amount) < Number(auction.reservePrice)) {
        auction.winnerId = null
      } else {
        auction.winnerId = highestBid?.bidderId ?? null
      }
    }

    await this.auctionRepo.save(auction)

    // A11: Mark bid statuses (WON for winner, OUTBID for others)
    await this.markBidStatuses(auction)

    // If there's a winner, create AUCTION_WIN order and update product status
    if (auction.winnerId) {
      await this.createAuctionWinOrder(auction)
      const product = await this.productRepo.findOne({ where: { id: auction.productId } })
      if (product) {
        product.status = ProductStatus.SOLD
        await this.productRepo.save(product)
      }
      // 🔔 通知：中標（買家）+ 賣家成交
      try {
        const productTitle = product?.titleZh || product?.titleEn || '拍賣商品'
        await this.notificationService.notify({
          userId: auction.winnerId,
          type: NotificationType.AUCTION_RESULT,
          title: '🎉 恭喜中標',
          message: `您以 MOP $${auction.currentPrice} 成功拍得「${productTitle}」，請盡快前往訂單完成付款`,
          link: '/user/orders',
        })
        await this.notificationService.notify({
          userId: auction.sellerId,
          type: NotificationType.AUCTION_RESULT,
          title: '拍賣成交',
          message: `您的「${productTitle}」已以 MOP $${auction.currentPrice} 成交`,
          link: '/seller/orders',
        })
      } catch (e) {
        console.error('[Auction] Winner notification failed (non-fatal):', e)
      }
    } else {
      // A1: No winner — restore product to ACTIVE for re-sale
      const product = await this.productRepo.findOne({ where: { id: auction.productId } })
      if (product && product.status !== ProductStatus.SOLD) {
        product.status = ProductStatus.ACTIVE
        await this.productRepo.save(product)
      }
      // 🔔 通知：有出價但流標 — 通知所有出價者拍賣已結束未成交
      if (auction.bidCount > 0) {
        try {
          const productTitle = product?.titleZh || product?.titleEn || '拍賣商品'
          const bidders = await this.bidRepo
            .createQueryBuilder('bid')
            .select('DISTINCT bid.bidderId', 'bidderId')
            .where('bid.auctionId = :auctionId', { auctionId: auction.id })
            .getRawMany()
          for (const row of bidders) {
            await this.notificationService.notify({
              userId: row.bidderId,
              type: NotificationType.AUCTION_RESULT,
              title: '拍賣已結束',
              message: `「${productTitle}」拍賣已結束，未達底價未能成交`,
              link: `/auction/${auction.id}`,
            })
          }
        } catch (e) {
          console.error('[Auction] No-winner notification failed (non-fatal):', e)
        }
      }
    }

    return auction
  }

  // A6: Manual end auction — seller can end auction early (only if seller)
  async endAuctionManual(auctionId: string, userId: string) {
    const auction = await this.findOne(auctionId)

    if (auction.sellerId !== userId) {
      throw new ForbiddenException('Only the seller can end the auction early')
    }

    if (auction.status !== AuctionStatus.ACTIVE) {
      throw new BadRequestException('Auction is not active')
    }

    return this.endAuction(auctionId)
  }

  // A8: BuyNow — buyer pays buyNowPrice to instantly win the auction
  async buyNow(auctionId: string, userId: string) {
    const auction = await this.auctionRepo.findOne({
      where: { id: auctionId },
      relations: ['product', 'seller']
    })

    if (!auction) {
      throw new NotFoundException('Auction not found')
    }

    if (auction.sellerId === userId) {
      throw new ForbiddenException('Sellers cannot buy their own auctions')
    }

    if (auction.status !== AuctionStatus.ACTIVE) {
      throw new BadRequestException('Auction is not active')
    }

    if (!auction.buyNowPrice || Number(auction.buyNowPrice) <= 0) {
      throw new BadRequestException('This auction does not support buy now')
    }

    const now = new Date()
    if (now > auction.endTime) {
      throw new BadRequestException('Auction has ended')
    }

    // 直購價必須高於當前最高價 — 否則有出價者會被低價搶走
    if (Number(auction.currentPrice) >= Number(auction.buyNowPrice)) {
      throw new BadRequestException(`直購價必須高於當前最高價 (MOP $${auction.currentPrice})`)
    }

    // End auction with this buyer as winner at buyNowPrice
    auction.status = AuctionStatus.ENDED
    auction.winnerId = userId
    auction.currentPrice = auction.buyNowPrice
    await this.auctionRepo.save(auction)

    // A11: Mark bid statuses (WON for winner, OUTBID for others)
    await this.markBidStatuses(auction)

    // Create AUCTION_WIN order at buyNowPrice
    await this.createAuctionWinOrder(auction)

    // Mark product as SOLD
    const product = await this.productRepo.findOne({ where: { id: auction.productId } })
    if (product) {
      product.status = ProductStatus.SOLD
      await this.productRepo.save(product)
    }

    // Broadcast auction end via WebSocket
    try {
      this.auctionGateway.broadcastAuctionEnd(auction.id, {
        id: userId,
        name: '',
        finalPrice: Number(auction.buyNowPrice),
      })
    } catch (e) {
      console.error('[Auction] WebSocket broadcastAuctionEnd (buyNow) failed:', e)
    }

    return { success: true, message: 'Buy now successful', auctionId, finalPrice: auction.buyNowPrice }
  }
}

