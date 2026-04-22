import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, FindOptionsWhere, ILike } from 'typeorm'
import { Product, ProductStatus } from '../../entities/product.entity'
import { CreateProductDto, UpdateProductDto, ProductFiltersDto } from './dto/product.dto'

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>
  ) {}

  async findAll(filters: ProductFiltersDto) {
    const where: FindOptionsWhere<Product> = {
      status: filters.status || ProductStatus.ACTIVE
    }

    if (filters.category?.length) {
      where.category = filters.category as any
    }
    if (filters.rarity?.length) {
      where.rarity = filters.rarity as any
    }
    if (filters.condition?.length) {
      where.condition = filters.condition as any
    }
    if (filters.listingType) {
      where.listingType = filters.listingType
    }

    const queryBuilder = this.productRepo
      .createQueryBuilder('product')
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
        '(product.titleEn ILIKE :search OR product.titleZh ILIKE :search OR product.brand ILIKE :search)',
        { search: `%${filters.search}%` }
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

    return {
      data,
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
      relations: ['seller']
    })

    if (!product) {
      throw new NotFoundException('Product not found')
    }

    // Parse images if stored as JSON string
    if (product.images && typeof product.images === 'string') {
      try {
        (product as any).images = JSON.parse(product.images)
      } catch {
        (product as any).images = [product.images]
      }
    }

    product.viewCount++
    await this.productRepo.save(product)

    return product
  }

  async create(dto: CreateProductDto, userId: string): Promise<Product> {
    // Handle images - store as JSON string
    const images = dto.images
    if (Array.isArray(images)) {
      dto.images = JSON.stringify(images)
    }

    // Set status to ACTIVE if listingType is provided (product is ready for marketplace)
    // Only keep as DRAFT if listingType is not set (product not ready for listing)
    const status = dto.listingType ? ProductStatus.ACTIVE : ProductStatus.DRAFT

    const product = this.productRepo.create({
      ...dto,
      sellerId: userId,
      status
    })

    return this.productRepo.save(product)
  }

  async update(id: string, dto: UpdateProductDto, userId: string): Promise<Product> {
    const product = await this.findOne(id)

    if (product.sellerId !== userId) {
      throw new ForbiddenException('You can only edit your own products')
    }

    // Handle images - store as JSON string
    if (dto.images && Array.isArray(dto.images)) {
      dto.images = JSON.stringify(dto.images) as any
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
