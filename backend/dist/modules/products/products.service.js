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
const tag_entity_1 = require("../../entities/tag.entity");
let ProductsService = class ProductsService {
    constructor(productRepo, tagRepo) {
        this.productRepo = productRepo;
        this.tagRepo = tagRepo;
    }
    async findAll(filters) {
        const queryBuilder = this.productRepo
            .createQueryBuilder('product')
            .leftJoinAndSelect('product.tags', 'tag')
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
            queryBuilder.andWhere('(product.titleEn LIKE :search OR product.titleZh LIKE :search OR product.brand LIKE :search OR EXISTS (SELECT 1 FROM tags t WHERE t.id IN (SELECT pt.tagId FROM product_tags pt WHERE pt.productId = product.id) AND t.name LIKE :search))', { search: `%${filters.search}%` });
        }
        if (filters.tags?.length) {
            const tagIds = filters.tags.map(t => parseInt(t)).filter(t => !isNaN(t));
            if (tagIds.length > 0) {
                queryBuilder.andWhere('tag.id IN (:...tagIds)', { tagIds });
            }
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
        const parsedData = data.map(product => {
            if (product.images && typeof product.images === 'string') {
                try {
                    product.images = JSON.parse(product.images);
                }
                catch {
                    product.images = [product.images];
                }
            }
            return product;
        });
        return {
            data: parsedData,
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
            relations: ['seller', 'tags']
        });
        if (!product) {
            throw new common_1.NotFoundException('Product not found');
        }
        await this.productRepo.query('UPDATE products SET viewCount = viewCount + 1 WHERE id = ?', [id]);
        if (product.images && typeof product.images === 'string') {
            try {
                product.images = JSON.parse(product.images);
            }
            catch {
                product.images = [product.images];
            }
        }
        return product;
    }
    async create(dto, userId) {
        const images = dto.images;
        if (Array.isArray(images)) {
            dto.images = JSON.stringify(images);
        }
        const listingType = dto.listingType || 'both';
        const status = product_entity_1.ProductStatus.ACTIVE;
        let tags = [];
        if (dto.tags && dto.tags.length > 0) {
            tags = await this.tagRepo.findByIds(dto.tags);
        }
        const product = this.productRepo.create({
            ...dto,
            quantity: dto.quantity ?? 1,
            listingType: listingType,
            sellerId: userId,
            status,
            tags
        });
        return this.productRepo.save(product);
    }
    async update(id, dto, userId) {
        const product = await this.findOne(id);
        if (product.sellerId !== userId) {
            throw new common_1.ForbiddenException('You can only edit your own products');
        }
        if (dto.images !== undefined && dto.images !== null && dto.images !== '') {
            if (Array.isArray(dto.images)) {
                dto.images = dto.images.length > 0 ? JSON.stringify(dto.images) : (product.images || '');
            }
            else if (typeof dto.images === 'string') {
            }
        }
        if (dto.tags !== undefined) {
            if (dto.tags && dto.tags.length > 0) {
                const tags = await this.tagRepo.findByIds(dto.tags);
                product.tags = tags;
                delete dto.tags;
            }
            else {
                product.tags = [];
            }
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
    async findBySeller(sellerId) {
        const products = await this.productRepo.find({
            where: { sellerId },
            relations: ['tags'],
            order: { createdAt: 'DESC' }
        });
        return products.map(p => {
            if (p.images && typeof p.images === 'string') {
                try {
                    p.images = JSON.parse(p.images);
                }
                catch {
                    p.images = [p.images];
                }
            }
            return p;
        });
    }
    async decreaseQuantity(productId, amount) {
        const product = await this.productRepo.findOne({ where: { id: productId } });
        if (!product) {
            throw new common_1.NotFoundException('Product not found');
        }
        const currentQty = product.quantity ?? 1;
        if (currentQty - amount < 0) {
            throw new common_1.BadRequestException('Out of stock');
        }
        await this.productRepo.update(productId, { quantity: currentQty - amount });
    }
};
exports.ProductsService = ProductsService;
exports.ProductsService = ProductsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(product_entity_1.Product)),
    __param(1, (0, typeorm_1.InjectRepository)(tag_entity_1.Tag)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], ProductsService);
//# sourceMappingURL=products.service.js.map