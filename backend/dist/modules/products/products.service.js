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
exports.ProductsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const product_entity_1 = require("../../entities/product.entity");
let ProductsService = class ProductsService {
    constructor(productRepo) {
        this.productRepo = productRepo;
    }
    async findAll(filters) {
        const where = {
            status: filters.status || product_entity_1.ProductStatus.ACTIVE
        };
        if (filters.category?.length) {
            where.category = filters.category;
        }
        if (filters.rarity?.length) {
            where.rarity = filters.rarity;
        }
        if (filters.condition?.length) {
            where.condition = filters.condition;
        }
        if (filters.listingType) {
            where.listingType = filters.listingType;
        }
        const queryBuilder = this.productRepo
            .createQueryBuilder('product')
            .where('product.status = :status', { status: filters.status || product_entity_1.ProductStatus.ACTIVE });
        if (filters.category?.length) {
            queryBuilder.andWhere('product.category IN (:...categories)', { categories: filters.category });
        }
        if (filters.rarity?.length) {
            queryBuilder.andWhere('product.rarity IN (:...rarities)', { rarities: filters.rarity });
        }
        if (filters.condition?.length) {
            queryBuilder.andWhere('product.condition IN (:...conditions)', { conditions: filters.condition });
        }
        if (filters.listingType) {
            queryBuilder.andWhere('product.listingType = :listingType', { listingType: filters.listingType });
        }
        if (filters.priceMin) {
            queryBuilder.andWhere('product.price >= :priceMin', { priceMin: filters.priceMin });
        }
        if (filters.priceMax) {
            queryBuilder.andWhere('product.price <= :priceMax', { priceMax: filters.priceMax });
        }
        if (filters.brand?.length) {
            queryBuilder.andWhere('product.brand IN (:...brands)', { brands: filters.brand });
        }
        if (filters.search) {
            queryBuilder.andWhere('(product.titleEn ILIKE :search OR product.titleZh ILIKE :search OR product.brand ILIKE :search)', { search: `%${filters.search}%` });
        }
        switch (filters.sortBy) {
            case 'price_asc':
                queryBuilder.orderBy('product.price', 'ASC');
                break;
            case 'price_desc':
                queryBuilder.orderBy('product.price', 'DESC');
                break;
            case 'popular':
                queryBuilder.orderBy('product.viewCount', 'DESC');
                break;
            default:
                queryBuilder.orderBy('product.createdAt', 'DESC');
        }
        const page = filters.page || 1;
        const limit = filters.limit || 20;
        queryBuilder.skip((page - 1) * limit).take(limit);
        const [data, total] = await queryBuilder.getManyAndCount();
        return {
            data,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }
    async findOne(id) {
        const product = await this.productRepo.findOne({
            where: { id },
            relations: ['seller']
        });
        if (!product) {
            throw new common_1.NotFoundException('Product not found');
        }
        product.viewCount++;
        await this.productRepo.save(product);
        return product;
    }
    async create(dto, userId) {
        const product = this.productRepo.create({
            ...dto,
            sellerId: userId,
            status: product_entity_1.ProductStatus.DRAFT
        });
        return this.productRepo.save(product);
    }
    async update(id, dto, userId) {
        const product = await this.findOne(id);
        if (product.sellerId !== userId) {
            throw new common_1.ForbiddenException('You can only edit your own products');
        }
        Object.assign(product, dto);
        return this.productRepo.save(product);
    }
    async remove(id, userId) {
        const product = await this.findOne(id);
        if (product.sellerId !== userId) {
            throw new common_1.ForbiddenException('You can only delete your own products');
        }
        await this.productRepo.remove(product);
    }
};
exports.ProductsService = ProductsService;
exports.ProductsService = ProductsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(product_entity_1.Product)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], ProductsService);
//# sourceMappingURL=products.service.js.map