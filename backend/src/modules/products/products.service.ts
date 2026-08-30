import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, FindOptionsWhere, ILike, Any } from 'typeorm'
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
    if (filters.rarity?.length) {
      queryBuilder.andWhere('product.rarity IN (:...rarities)', { rarities: filters.rarity })
    }
    if (filters.condition?.length) {
      queryBuilder.andWhere('product.condition IN (:...conditions)', { conditions: filters.condition })
    }
    if (filters.listingType) {
      queryBuilder.andWhere('product.listingType = :listingType', { listingType: filters.listingType })
    }
    if (filters.priceMin) {
      queryBuilder.andWhere('product.price >= :priceMin', { priceMin: filters.priceMin })
    }
    if (filters.priceMax) {
      queryBuilder.andWhere('product.price <= :priceMax', { priceMax: filters.priceMax })
    }
    if (filters.brand?.length) {
      queryBuilder.andWhere('product.brand IN (:...brands)', { brands: filters.brand })
    }
    if (filters.search) {
      queryBuilder.andWhere(
        '(product.titleEn LIKE :search OR product.titleZh LIKE :search OR product.brand LIKE :search OR EXISTS (SELECT 1 FROM tags t WHERE t.id IN (SELECT pt.tagId FROM product_tags pt WHERE pt.productId = product.id) AND t.name LIKE :search))',
        { search: `%${filters.search}%` }
      )
    }
    // Filter by tags
    if (filters.tags?.length) {
      const tagIds = filters.tags.map(t => parseInt(t)).filter(t => !isNaN(t))
      if (tagIds.length > 0) {
        queryBuilder.andWhere('tag.id IN (:...tagIds)', { tagIds })
      }
    }

    // Filter by productTypeTags (stored as productTypeTagId)
    if ((filters as any).productTypeTags?.length) {
      const typeTagIds = (filters as any).productTypeTags.map((t: string) => parseInt(t)).filter((t: number) => !isNaN(t))
      if (typeTagIds.length > 0) {
        queryBuilder.andWhere('product.productTypeTagId IN (:...typeTagIds)', { typeTagIds })
      }
    }

    // Filter by language
    if ((filters as any).language?.length) {
      queryBuilder.andWhere('product.language IN (:...languages)', { languages: (filters as any).language })
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
    const reservationCount = await this.reservationRepo.count({
      where: { productId: id, status: ReservationStatus.DEPOSIT_PAID }
    });
    (product as any).reservationCount = reservationCount;

    return product
  }

  async create(dto: CreateProductDto, userId: string): Promise<Product> {
    // Handle images - store as JSON string
    const images = dto.images
    if (Array.isArray(images)) {
      dto.images = JSON.stringify(images)
    }

    // Default listingType to 'both' if not provided, always set to ACTIVE
    const listingType = dto.listingType || 'both'
    const status = ProductStatus.ACTIVE

    // Handle tags - find or create tags by name
    let tags: Tag[] = []
    if (dto.tags && dto.tags.length > 0) {
      tags = await this.tagRepo.findByIds(dto.tags)
    }

    // productTypeTags - store as productTypeTagId field
    if ((dto as any).productTypeTags !== undefined) {
      const typeTagIds = (dto as any).productTypeTags
      if (typeTagIds && typeTagIds.length > 0) {
        (dto as any).productTypeTagId = typeTagIds[0] // Take first one
      } else {
        (dto as any).productTypeTagId = null
      }
      delete (dto as any).productTypeTags
    }

    const product = this.productRepo.create({
      ...dto,
      quantity: dto.quantity ?? 1,
      listingType: listingType as any,
      sellerId: userId,
      status,
      tags,
      isActive: dto.isActive !== undefined ? dto.isActive : true
    } as any)

    return this.productRepo.save(product) as any
  }

  async update(id: string, dto: UpdateProductDto, userId: string): Promise<Product> {
    const product = await this.findOne(id)

    if (product.sellerId !== userId) {
      throw new ForbiddenException('You can only edit your own products')
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
// Handle productTypeTags - store as productTypeTagId field
    if ((dto as any).productTypeTags !== undefined) {
      const typeTagIds = (dto as any).productTypeTags
      if (typeTagIds && typeTagIds.length > 0) {
        (dto as any).productTypeTagId = typeTagIds[0] // Take first one
      } else {
        (dto as any).productTypeTagId = null
      }
      delete (dto as any).productTypeTags
    }

    Object.assign(product, dto)
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

    // Soft delete: mark as removed instead of hard delete (preserves order history)
    product.status = ProductStatus.REMOVED
    // findOne() parses images from string to array; convert back to string for save
    if (Array.isArray(product.images)) {
      product.images = JSON.stringify(product.images)
    }
    await this.productRepo.save(product)
  }

  async findBySeller(sellerId: string): Promise<Product[]> {
    const products = await this.productRepo.find({
      where: { sellerId },
      relations: ['tags'],
      order: { createdAt: 'DESC' }
    })

    // Parse images for each product
    return products.map(p => {
      if (p.images && typeof p.images === 'string') {
        try {
          (p as any).images = JSON.parse(p.images)
        } catch {
          (p as any).images = [p.images]
        }
      }
      return p
    })
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
