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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Product = exports.ProductStatus = exports.ListingType = exports.ProductCondition = exports.ProductRarity = exports.ProductCategory = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("./user.entity");
const auction_entity_1 = require("./auction.entity");
const tag_entity_1 = require("./tag.entity");
var ProductCategory;
(function (ProductCategory) {
    ProductCategory["POKEMON"] = "pokemon";
    ProductCategory["YUGIOH"] = "yugioh";
    ProductCategory["MTG"] = "mtg";
    ProductCategory["ULTRAMAN"] = "ultraman";
    ProductCategory["ONEPiece"] = "onepiece";
    ProductCategory["DORAEMON"] = "doraemon";
    ProductCategory["SPORTS"] = "sports";
    ProductCategory["OTHER"] = "other";
})(ProductCategory || (exports.ProductCategory = ProductCategory = {}));
var ProductRarity;
(function (ProductRarity) {
    ProductRarity["COMMON"] = "common";
    ProductRarity["RARE"] = "rare";
    ProductRarity["SUPER_RARE"] = "super_rare";
    ProductRarity["ULTRA_RARE"] = "ultra_rare";
    ProductRarity["SECRET_RARE"] = "secret_rare";
})(ProductRarity || (exports.ProductRarity = ProductRarity = {}));
var ProductCondition;
(function (ProductCondition) {
    ProductCondition["MINT"] = "mint";
    ProductCondition["NEAR_MINT"] = "near_mint";
    ProductCondition["EXCELLENT"] = "excellent";
    ProductCondition["GOOD"] = "good";
    ProductCondition["FAIR"] = "fair";
})(ProductCondition || (exports.ProductCondition = ProductCondition = {}));
var ListingType;
(function (ListingType) {
    ListingType["BOTH"] = "both";
    ListingType["SALE_ONLY"] = "sale_only";
    ListingType["AUCTION_ONLY"] = "auction_only";
})(ListingType || (exports.ListingType = ListingType = {}));
var ProductStatus;
(function (ProductStatus) {
    ProductStatus["DRAFT"] = "draft";
    ProductStatus["ACTIVE"] = "active";
    ProductStatus["SOLD"] = "sold";
    ProductStatus["ENDED"] = "ended";
    ProductStatus["CANCELLED"] = "cancelled";
})(ProductStatus || (exports.ProductStatus = ProductStatus = {}));
let Product = class Product {
};
exports.Product = Product;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Product.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Product.prototype, "sellerId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User),
    (0, typeorm_1.JoinColumn)({ name: 'sellerId' }),
    __metadata("design:type", user_entity_1.User)
], Product.prototype, "seller", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ProductCategory }),
    __metadata("design:type", String)
], Product.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Product.prototype, "brand", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Product.prototype, "series", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ProductRarity }),
    __metadata("design:type", String)
], Product.prototype, "rarity", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ProductCondition }),
    __metadata("design:type", String)
], Product.prototype, "condition", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Product.prototype, "titleEn", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Product.prototype, "titleZh", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Product.prototype, "descriptionEn", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Product.prototype, "descriptionZh", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], Product.prototype, "price", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Product.prototype, "images", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Product.prototype, "thumbnail", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Product.prototype, "cardNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ListingType }),
    __metadata("design:type", String)
], Product.prototype, "listingType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ProductStatus, default: ProductStatus.DRAFT }),
    __metadata("design:type", String)
], Product.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], Product.prototype, "viewCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], Product.prototype, "favoriteCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], Product.prototype, "stock", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true, default: 1 }),
    __metadata("design:type", Number)
], Product.prototype, "quantity", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => auction_entity_1.Auction, auction => auction.product),
    __metadata("design:type", Array)
], Product.prototype, "auctions", void 0);
__decorate([
    (0, typeorm_1.ManyToMany)(() => tag_entity_1.Tag, tag => tag.products),
    (0, typeorm_1.JoinTable)({
        name: 'product_tags',
        joinColumn: { name: 'productId', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'tagId', referencedColumnName: 'id' }
    }),
    __metadata("design:type", Array)
], Product.prototype, "tags", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Product.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Product.prototype, "updatedAt", void 0);
exports.Product = Product = __decorate([
    (0, typeorm_1.Entity)('products')
], Product);
//# sourceMappingURL=product.entity.js.map