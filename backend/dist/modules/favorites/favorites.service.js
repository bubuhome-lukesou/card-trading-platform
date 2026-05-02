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
exports.FavoritesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const favorite_entity_1 = require("../../entities/favorite.entity");
let FavoritesService = class FavoritesService {
    constructor(favoriteRepo) {
        this.favoriteRepo = favoriteRepo;
    }
    async findByUser(userId, page = 1, limit = 20) {
        const [data, total] = await this.favoriteRepo.findAndCount({
            where: { userId },
            relations: ['product', 'product.images', 'product.tags'],
            order: { createdAt: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });
        return { data, total, page, limit };
    }
    async add(userId, productId) {
        const existing = await this.favoriteRepo.findOne({ where: { userId, productId } });
        if (existing)
            return existing;
        const favorite = this.favoriteRepo.create({ userId, productId });
        return this.favoriteRepo.save(favorite);
    }
    async remove(userId, productId) {
        await this.favoriteRepo.delete({ userId, productId });
        return { deleted: true };
    }
    async isFavorite(userId, productId) {
        const fav = await this.favoriteRepo.findOne({ where: { userId, productId } });
        return !!fav;
    }
};
exports.FavoritesService = FavoritesService;
exports.FavoritesService = FavoritesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(favorite_entity_1.Favorite)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], FavoritesService);
//# sourceMappingURL=favorites.service.js.map