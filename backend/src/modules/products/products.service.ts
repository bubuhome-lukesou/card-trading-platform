import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, FindOptionsWhere, ILike, Any } from 'typeorm'
import { Product, ProductStatus } from '../../entities/product.entity'
import { Tag } from '../../entities/tag.entity'
import { CreateProductDto, UpdateProductDto, ProductFiltersDto } from './dto/product.dto'

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(Tag)
    private readonly tagRepo: Repository<Tag>
  ) {}

  async findAll(filters: ProductFiltersDto) {
    const queryBuilder = this.productRepo
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.tags', 'tag')
      .where('product.status = :status', { status: filters.status || ProductStatus.ACTIVE })

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
        '(product.titleEn LIKE :search OR product.titleZh LIKE :search OR product.brand LIKE :search)',
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

    const product = this.productRepo.create({
      ...dto,
      listingType: listingType as any,
      sellerId: userId,
      status,
      tags
    })

    return this.productRepo.save(product)
  }

  async update(id: string, dto: UpdateProductDto, userId: string): Promise<Product> {
    const product = await this.findOne(id)

    if (product.sellerId !== userId) {
      throw new ForbiddenException('You can only edit your own products')
    }

    // Handle images - store as JSON string, skip if empty/undefined
    if (dto.images !== undefined && dto.images !== null && dto.images !== '') {
      if (Array.isArray(dto.images)) {
        dto.images = dto.images.length > 0 ? JSON.stringify(dto.images) as any : (product.images || '')
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

    Object.assign(product, dto)
    return this.productRepo.save(product)
  }

  async remove(id: string, userId: string): Promise<void> {
    const product = await this.findOne(id)

    if (product.sellerId !== userId) {
      throw new ForbiddenException('You can only delete your own products')
    }

    await this.productRepo.remove(product)
  }

  async findBySeller(sellerId: string): Promise<Product[]> {
    const products = await this.productRepo.find({
      where: { sellerId },
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
}
