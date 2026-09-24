import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, FindOptionsWhere, ILike, Any, DataSource } from 'typeorm'
import { Product, ProductStatus } from '../../entities/product.entity'
import { Tag } from '../../entities/tag.entity'
import { Reservation, ReservationStatus } from '../../entities/reservation.entity'
import { CreateProductDto, UpdateProductDto, ProductFiltersDto } from './dto/product.dto'

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(Tag)
    private readonly tagRepo: Repository<Tag>,
    @InjectRepository(Reservation)
    private readonly reservationRepo: Repository<Reservation>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(filters: ProductFiltersDto) {
    const queryBuilder = this.productRepo
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.tags', 'tag')
      .leftJoinAndSelect('product.seller', 'seller')
      .where('product.status = :status', { status: filters.status || ProductStatus.ACTIVE })
      .andWhere('product.isActive = :isActive', { isActive: true })

    if (filters.category?.length) {
      queryBuilder.andWhere('product.category IN (:...categories)', { categories: filters.category })
    }
    if (filters.condition?.length) {
      queryBuilder.andWhere('product.condition IN (:...conditions)', { conditions: filters.condition })
    }
    // listingType: support single value or array (listingTypes)
    const ltFilter = (filters as any).listingTypes || (filters as any).listingType
    if (ltFilter) {
      const ltArray = Array.isArray(ltFilter) ? ltFilter : [ltFilter]
      if (ltArray.length > 0) {
        queryBuilder.andWhere('product.listingType IN (:...listingTypes)', { listingTypes: ltArray })
      }
    }
    if (filters.priceMin) {
      queryBuilder.andWhere('product.price >= :priceMin', { priceMin: filters.priceMin })
    }
    if (filters.priceMax) {
      queryBuilder.andWhere('product.price <= :priceMax', { priceMax: filters.priceMax })
    }
    if (filters.search) {
      // 純數字搜尋優先精確匹配商品編號（如輸入 10 位編號直達該商品），否則照舊標題/標籤
      const s = (filters.search as string).trim()
      if (/^\d{8,12}$/.test(s)) {
        queryBuilder.andWhere('product.productNumber = :num', { num: s })
      } else {
        queryBuilder.andWhere(
          '(product.titleEn LIKE :search OR product.titleZh LIKE :search OR product.productNumber LIKE :search OR EXISTS (SELECT 1 FROM tags t WHERE t.id IN (SELECT pt.tagId FROM product_tags pt WHERE pt.productId = product.id) AND t.name LIKE :search))',
          { search: `%${s}%` }
        )
      }
    }
    // Filter by seller(s) — marketplace 商家篩選
    if ((filters as any).sellerIds?.length) {
      queryBuilder.andWhere('product.sellerId IN (:...sellerIds)', { sellerIds: (filters as any).sellerIds })
    }
    // Filter by tags
    if (filters.tags?.length) {
      const tagIds = filters.tags.map(t => parseInt(t)).filter(t => !isNaN(t))
      if (tagIds.length > 0) {
        queryBuilder.andWhere('tag.id IN (:...tagIds)', { tagIds })
      }
    }

    // Filter by productType (supports array or single value)
    const ptFilter = (filters as any).productType
    if (ptFilter) {
      if (Array.isArray(ptFilter) && ptFilter.length > 0) {
        queryBuilder.andWhere('product.productType IN (:...productTypes)', { productTypes: ptFilter })
      } else if (typeof ptFilter === 'string') {
        queryBuilder.andWhere('product.productType = :productType', { productType: ptFilter })
      }
    }

    // Filter by language
    if ((filters as any).language?.length) {
      queryBuilder.andWhere('product.language IN (:...languages)', { languages: (filters as any).language })
    }

    // Filter out sold items (quantity = 0)
    if (filters.hideSold) {
      queryBuilder.andWhere('product.quantity > 0')
    }
    // Filter out expired reservations (reservationDeadline 已過) — 逾時未成交嘅預訂商品
    // 條件：listingType=reservation 時 deadline 必須未過；deadline 為 NULL 一律隱藏（無有效截單時間）
    if ((filters as any).hideExpired) {
      queryBuilder.andWhere(
        "(product.listingType != 'reservation' OR (product.reservationDeadline IS NOT NULL AND product.reservationDeadline > :nowExpired))",
        { nowExpired: new Date() }
      )
    }
    // Filter out ended auctions — 拍賣品其最新 auction 記錄已 ended（effective：endTime 已過）
    // 用 NOT EXISTS 子查詢：存在 active/pending 拍賣先顯示；ended/cancelled/無記錄都隱藏
    if ((filters as any).hideEndedAuction) {
      queryBuilder.andWhere(
        "(product.listingType != 'auction' OR EXISTS (SELECT 1 FROM auctions a WHERE a.productId = product.id AND a.status IN ('active','pending')))"
      )
    }

    // Sorting
    switch (filters.sortBy) {
      case 'price_asc':
        queryBuilder.orderBy('product.price', 'ASC')
        break
      case 'price_desc':
        queryBuilder.orderBy('product.price', 'DESC')
        break
      case 'popular':
        queryBuilder.orderBy('product.viewCount', 'DESC')
        break
      default:
        queryBuilder.orderBy('product.createdAt', 'DESC')
    }

    const page = filters.page || 1
    const limit = filters.limit || 20
    queryBuilder.skip((page - 1) * limit).take(limit)

    const [data, total] = await queryBuilder.getManyAndCount()

    // Parse images for each product (stored as JSON string in DB)
    const parsedData = data.map(product => {
      if (product.images && typeof product.images === 'string') {
        try {
          (product as any).images = JSON.parse(product.images)
        } catch {
          (product as any).images = [product.images]
        }
      }
      return product
    })

    // Optionally attach auction summary (auctionId/currentPrice/bidCount/endTime)
    // to auction-listing products — one batched query, no N+1.
    if ((filters as any).withAuction) {
      const auctionProductIds = parsedData
        .filter(p => (p as any).listingType === 'auction')
        .map(p => p.id)
      if (auctionProductIds.length > 0) {
        const auctions = await this.dataSource.query(
          `SELECT a.id, a.productId, a.currentPrice, a.startingPrice, a.bidCount, a.endTime, a.startTime, a.status
           FROM auctions a
           WHERE a.productId IN (?) AND a.status IN ('active','pending','ended','cancelled')
           ORDER BY a.createdAt DESC`,
          [auctionProductIds]
        )
        const now = new Date()
        const byProduct = new Map<string, any>()
        for (const a of auctions) {
          if (!byProduct.has(a.productId)) byProduct.set(a.productId, a)
        }
        for (const p of parsedData) {
          const a = byProduct.get(p.id)
          if (a) {
            // Effective status at read time — don't wait for the minute cron:
            // pending past startTime shows active; active past endTime shows ended.
            const dbStatus = a.status
            const effStatus =
              dbStatus === 'pending' && new Date(a.startTime) <= now ? 'active'
              : dbStatus === 'active' && new Date(a.endTime) <= now ? 'ended'
              : dbStatus
            ;(p as any).auctionSummary = {
              auctionId: a.id,
              currentPrice: a.currentPrice,
              startingPrice: a.startingPrice,
              bidCount: a.bidCount,
              endTime: a.endTime,
              status: effStatus,
            }
          }
        }
      }
    }

    return {
      data: parsedData,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    }
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.productRepo.findOne({
      where: { id },
      relations: ['seller', 'tags']
    })

    if (!product) {
      throw new NotFoundException('Product not found')
    }

    // Increment viewCount using raw SQL to avoid TypeORM entity/dirty checking issues
    await this.productRepo.query(
      'UPDATE products SET viewCount = viewCount + 1 WHERE id = ?',
      [id]
    )

    // Parse images for response (original string is unchanged in DB)
    if (product.images && typeof product.images === 'string') {
      try {
        (product as any).images = JSON.parse(product.images)
      } catch {
        (product as any).images = [product.images]
      }
    }

    // Get reservation count (only DEPOSIT_PAID status)
    // Expired PENDING rows are excluded so released spots show immediately,
    // without waiting for the minute cron to flip their status.
    const reservationCount = await this.reservationRepo
      .createQueryBuilder('r')
      .where('r.productId = :id', { id })
      .andWhere('r.status IN (:...statuses)', {
        statuses: [ReservationStatus.PENDING, ReservationStatus.DEPOSIT_PAID, ReservationStatus.CONFIRMED]
      })
      .andWhere('(r.status != :pendingStatus OR r.expireTime > :now)', {
        pendingStatus: ReservationStatus.PENDING,
        now: new Date(),
      })
      .select('COALESCE(SUM(r.quantity), 0)', 'total')
      .getRawOne();
    (product as any).reservationCount = parseInt(reservationCount?.total || '0', 10);

    return product
  }

  async create(dto: CreateProductDto, userId: string): Promise<Product> {
    // Handle images - store as JSON string
    const images = dto.images
    if (Array.isArray(images)) {
      dto.images = JSON.stringify(images)
    }

    // ===== 按銷售模式驗證必要欄位（拍賣/預約時間必填） =====
    const listingType = dto.listingType || 'both'
    const now = Date.now()

    // 品相已改為選填，不再擋 create

    // 售價驗證：sale 必須 >0；auction/reservation 由各自欄位（startingPrice/deposit）定價，price 可為 0
    if (listingType === 'sale') {
      if (dto.price === undefined || dto.price === null || Number(dto.price) <= 0) {
        throw new BadRequestException('售價必須大於 0')
      }
    } else if (listingType === 'auction') {
      if (dto.price !== undefined && dto.price !== null && dto.price < 0) {
        throw new BadRequestException('售價不可為負數')
      }
    }

    if (listingType === 'auction') {
      if (!dto.auctionEndTime) {
        throw new BadRequestException('拍賣結束時間為必填項')
      }
      const endTime = new Date(dto.auctionEndTime).getTime()
      if (isNaN(endTime)) {
        throw new BadRequestException('拍賣結束時間格式無效')
      }
      if (endTime <= now + 60 * 1000) {
        throw new BadRequestException('拍賣結束時間必須至少在 1 分鐘之後')
      }
      if (dto.startingPrice === undefined || dto.startingPrice === null || dto.startingPrice <= 0) {
        throw new BadRequestException('起拍價必須大於 0')
      }
      if (dto.bidIncrement !== undefined && dto.bidIncrement <= 0) {
        throw new BadRequestException('加價幅度必須大於 0')
      }
    }

    if (listingType === 'reservation') {
      if (!dto.reservationDeadline) {
        throw new BadRequestException('預約截止時間為必填項')
      }
      const deadline = new Date(dto.reservationDeadline).getTime()
      if (isNaN(deadline)) {
        throw new BadRequestException('預約截止時間格式無效')
      }
      if (deadline <= now) {
        throw new BadRequestException('預約截止時間必須在當前時間之後')
      }
      if (dto.reservationDeposit === undefined || dto.reservationDeposit < 0) {
        throw new BadRequestException('訂金金額不可為負數')
      }
      if (dto.reservationMax !== undefined && dto.reservationMax < 1) {
        throw new BadRequestException('預付名額上限必須至少為 1')
      }
    }

    const status = ProductStatus.ACTIVE

    // Handle tags - find or create tags by name
    let tags: Tag[] = []
    if (dto.tags && dto.tags.length > 0) {
      tags = await this.tagRepo.findByIds(dto.tags)
    }

    // productType is now a direct string value, no conversion needed

    // 對外商品編號：純數字、系統自動生成、不可修改
    // 格式：10位數字 = 時間戳秒數(去首位) + 4位隨機 — 唯一性由 unique index + 衝突重試保證
    const productNumber = await this.generateProductNumber()

    const product = this.productRepo.create({
      ...dto,
      productNumber,
      quantity: dto.quantity ?? 1,
      listingType: listingType as any,
      sellerId: userId,
      status,
      tags,
      isActive: dto.isActive !== undefined ? dto.isActive : true
    } as any)

    return this.productRepo.save(product) as any
  }

  /**
   * 生成唯一商品編號（純數字，10 位）— 順序生成、永不重用、不依賴時鐘準確性
   *
   * 格式：YYMMDD + 4位序號（淘寶式日期+每日順序號）
   *   - 2609160001 = 2026-09-16 當日第 1 件
   *   - 同日內序號嚴格遞增；跨日自然換前綴
   *
   * 單調保護（時鐘回跳免疫）：
   *   counters 表記錄 last_date + seq，生成時比較：
   *   - current > last_date（正常過日）→ 前綴=新日期，seq 重置 1
   *   - current == last_date（同日）  → 前綴不變，seq+1
   *   - current < last_date（NTP 回跳）→ 前綴凍結在 last_date，seq 續加
   *   → 已發出的號碼永遠不會再發（前綴=見過的最大日期，序號只加不減）
   *
   * 併發安全：UPDATE ... SET seq=seq+1 單行原子操作（InnoDB 行鎖），
   *   以 SELECT ... FOR UPDATE 讀取後在同一事務內寫回。
   * 號碼不重用：軟刪/硬刪商品號碼作廢不回收；unique index 兜底。
   */
  private async generateProductNumber(): Promise<number> {
    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()
    try {
      // 取日期前綴（本機時間；即使不準，單調保護也保證不重複）
      const now = new Date()
      const yy = String(now.getFullYear()).slice(-2)
      const mm = String(now.getMonth() + 1).padStart(2, '0')
      const dd = String(now.getDate()).padStart(2, '0')
      const currentDate = `${yy}${mm}${dd}` // 6位

      // 鎖定計數器行（FOR UPDATE：其他生成請求排隊，保證併發下不重複）
      const counterRows: any[] = await queryRunner.query(
        `SELECT last_date, seq FROM counters WHERE name = 'productNumber' FOR UPDATE`
      )
      if (!counterRows.length) throw new BadRequestException('計數器缺失，請聯繫管理員')
      const lastDate: string = counterRows[0].last_date
      const lastSeq: number = Number(counterRows[0].seq)

      let prefix: string
      let nextSeq: number
      if (currentDate > lastDate) {
        // 正常過日（或首次）→ 新日期段，序號從 1 開始
        prefix = currentDate
        nextSeq = 1
      } else {
        // 同日續號；時鐘回跳（current < last_date）→ 凍結在 last_date 續加
        prefix = lastDate
        nextSeq = lastSeq + 1
      }

      if (nextSeq > 9999) {
        // 單日理論上限（4位序號）；按目前商品量不可能觸及
        // 保底：溢出時延續序號進位會破壞10位長度 → 直接拋錯人工介入
        throw new BadRequestException('商品編號單日額度已滿，請聯繫管理員')
      }

      await queryRunner.query(
        `UPDATE counters SET last_date = ?, seq = ? WHERE name = 'productNumber'`,
        [prefix, nextSeq]
      )
      await queryRunner.commitTransaction()

      const productNumber = Number(`${prefix}${String(nextSeq).padStart(4, '0')}`)
      return productNumber
    } catch (err) {
      await queryRunner.rollbackTransaction()
      throw err
    } finally {
      await queryRunner.release()
    }
  }

  async update(id: string, dto: UpdateProductDto, userId: string): Promise<Product> {
    const product = await this.findOne(id)

    if (product.sellerId !== userId) {
      throw new ForbiddenException('You can only edit your own products')
    }

    // 已售商品不可編輯（訂單價格/內容已鎖定）
    if ((product.status as string) === ProductStatus.SOLD) {
      throw new ForbiddenException('已售出的商品不可編輯')
    }

    // Handle images - store as JSON string, skip if empty/undefined/empty array
    if (dto.images !== undefined && dto.images !== null) {
      if (Array.isArray(dto.images)) {
        if (dto.images.length > 0) {
          dto.images = JSON.stringify(dto.images) as any
        } else {
          // Empty array - don't update images field, keep existing
          delete dto.images
        }
      } else if (typeof dto.images === 'string') {
        // Already a string, use as-is
      }
    }

    // Handle tags
    if (dto.tags !== undefined) {
      if (dto.tags && dto.tags.length > 0) {
        const tags = await this.tagRepo.findByIds(dto.tags)
        product.tags = tags
        delete dto.tags
      } else {
        product.tags = []
      }
    }
    // productType is now a direct string value, no conversion needed

    // 品相已改為選填：condition 傳 null 時清空欄位
    if (dto.condition === undefined) {
      delete dto.condition
    }

    Object.assign(product, dto)
    // Sync status with isActive flag — when seller toggles 上架/下架
    // status must match so marketplace query (status='active' AND isActive=true) works
    if (dto.isActive !== undefined) {
      if (dto.isActive === true) {
        // 上架: set status to active (only if not sold)
        if (product.status !== ProductStatus.SOLD) {
          product.status = ProductStatus.ACTIVE
        }
      } else {
        // 下架: set status to removed
        product.status = ProductStatus.REMOVED
      }
    }
    // findOne() parses images from string to array; convert back to string for save
    if (Array.isArray(product.images)) {
      product.images = JSON.stringify(product.images)
    }
    return this.productRepo.save(product)
  }

  async remove(id: string, userId: string): Promise<void> {
    const product = await this.findOne(id)

    if (product.sellerId !== userId) {
      throw new ForbiddenException('You can only delete your own products')
    }

    // ===== 刪除限制（保護買家權益，符合主流平台慣例） =====
    // 1. 活躍拍賣（有進行中/即將開始的拍賣）不可刪除——需先取消拍賣
    const activeAuction = await this.dataSource.query(
      `SELECT id, status FROM auctions WHERE productId = ? AND status IN ('active', 'pending') LIMIT 1`,
      [id]
    )
    if (activeAuction.length > 0) {
      throw new BadRequestException(
        '此商品有進行中或即將開始的拍賣，不能刪除。請先取消拍賣。'
      )
    }

    // 2. 進行中的預約（pending/confirmed/deposit_paid）不可刪除
    const activeReservation = await this.dataSource.query(
      `SELECT id, status FROM reservations WHERE productId = ? AND status IN ('pending', 'deposit_paid', 'confirmed') LIMIT 1`,
      [id]
    )
    if (activeReservation.length > 0) {
      throw new BadRequestException(
        '此商品有進行中的預約（待付款/待確認），不能刪除。請先處理相關預約。'
      )
    }

    // 3. 未完成訂單（pending/pending_paid/confirmed/processing）不可刪除
    const activeOrder = await this.dataSource.query(
      `SELECT id, status FROM orders WHERE productId = ? AND status IN ('pending', 'pending_paid', 'confirmed', 'processing') LIMIT 1`,
      [id]
    )
    if (activeOrder.length > 0) {
      throw new BadRequestException(
        '此商品有未完成的訂單，不能刪除。請先完成或取消相關訂單。'
      )
    }

    // Soft delete: mark as removed instead of hard delete (preserves order history)
    product.status = ProductStatus.REMOVED
    // findOne() parses images from string to array; convert back to string for save
    if (Array.isArray(product.images)) {
      product.images = JSON.stringify(product.images)
    }
    await this.productRepo.save(product)
  }

  // Parse images JSON string into array (shared helper)
  private parseProductImages(p: Product): Product {
    if (p.images && typeof p.images === 'string') {
      try {
        (p as any).images = JSON.parse(p.images)
      } catch {
        (p as any).images = [p.images]
      }
    }
    return p
  }

  async findBySeller(sellerId: string, page?: number, limit?: number): Promise<Product[] | { data: Product[]; total: number; page: number; limit: number }> {
    const hasPagination = page !== undefined || limit !== undefined
    const pageNum = page && page > 0 ? page : 1
    const limitNum = limit && limit > 0 ? limit : 50

    // S14: Support pagination — previously page/limit params were ignored
    const qb = this.productRepo
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.tags', 'tags')
      .where('product.sellerId = :sellerId', { sellerId })
      .andWhere('product.status != :removed', { removed: 'removed' })
      .orderBy('product.createdAt', 'DESC')

    const total = await qb.getCount()

    if (hasPagination) {
      const products = await qb
        .skip((pageNum - 1) * limitNum)
        .take(limitNum)
        .getMany()

      // Parse images for each product
      return {
        data: products.map(p => this.parseProductImages(p)),
        total,
        page: pageNum,
        limit: limitNum,
      }
    }

    // Legacy: no pagination params → return all products as array (backwards compatible)
    const products = await qb.getMany()
    return products.map(p => this.parseProductImages(p))
  }

  async decreaseQuantity(productId: string, amount: number): Promise<void> {
    // Atomic update — prevents TOCTOU race condition
    const result = await this.productRepo
      .createQueryBuilder()
      .update(Product)
      .set({ quantity: () => 'quantity - :amount' })
      .where('id = :productId AND quantity >= :amount', { productId, amount })
      .execute()
    if (result.affected === 0) {
      throw new BadRequestException('Out of stock or insufficient quantity')
    }
    // Auto-mark as SOLD when quantity reaches 0
    await this.productRepo
      .createQueryBuilder()
      .update(Product)
      .set({ status: ProductStatus.SOLD })
      .where('id = :productId AND quantity <= 0', { productId })
      .execute()
  }

  async increaseQuantity(productId: string, amount: number): Promise<void> {
    await this.productRepo
      .createQueryBuilder()
      .update(Product)
      .set({ quantity: () => 'quantity + :amount' })
      .where('id = :productId', { productId, amount })
      .execute()
  }
}
