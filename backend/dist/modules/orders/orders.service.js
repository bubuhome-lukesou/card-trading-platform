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
exports.OrdersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const order_entity_1 = require("../../entities/order.entity");
const product_entity_1 = require("../../entities/product.entity");
const order_entity_2 = require("../../entities/order.entity");
const products_service_1 = require("../products/products.service");
let OrdersService = class OrdersService {
    constructor(orderRepo, productRepo, productsService) {
        this.orderRepo = orderRepo;
        this.productRepo = productRepo;
        this.productsService = productsService;
    }
    async findByBuyer(buyerId, page = 1, limit = 20) {
        const [data, total] = await this.orderRepo.findAndCount({
            where: { buyerId },
            relations: ['product', 'seller'],
            order: { createdAt: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });
        return { data, total, page, limit };
    }
    async findBySeller(sellerId, page = 1, limit = 20) {
        const [data, total] = await this.orderRepo.findAndCount({
            where: { sellerId },
            relations: ['product', 'buyer'],
            order: { createdAt: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });
        return { data, total, page, limit };
    }
    async findOne(id) {
        const order = await this.orderRepo.findOne({
            where: { id },
            relations: ['product', 'buyer', 'seller'],
        });
        if (!order)
            throw new common_1.NotFoundException('Order not found');
        return order;
    }
    async create(data) {
        if (!data.orderNumber) {
            data.orderNumber = 'ORD-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
        }
        if (!data.totalPrice && data.totalPrice !== 0 && data.productId) {
            const product = await this.productRepo.findOne({ where: { id: data.productId } });
            if (product) {
                data.totalPrice = product.price * (data.quantity || 1);
                data.sellerId = product.sellerId;
            }
        }
        if (!data.sellerId && data.productId) {
            const product = await this.productRepo.findOne({ where: { id: data.productId } });
            if (product)
                data.sellerId = product.sellerId;
        }
        if (!data.totalPrice && data.totalPrice !== 0)
            data.totalPrice = 0;
        if (data.shippingCost === undefined)
            data.shippingCost = 0;
        if (data.platformFee === undefined)
            data.platformFee = 0;
        if (!data.status)
            data.status = order_entity_2.OrderStatus.PENDING;
        const order = this.orderRepo.create(data);
        const savedOrder = await this.orderRepo.save(order);
        if (data.productId) {
            const qty = data.quantity || 1;
            await this.productsService.decreaseQuantity(data.productId, qty);
        }
        return savedOrder;
    }
    async confirmPayment(orderId) {
        const order = await this.findOne(orderId);
        order.status = order_entity_2.OrderStatus.CONFIRMED;
        order.paymentTime = new Date();
        return this.orderRepo.save(order);
    }
    async updateTransferReceipt(orderId, receiptUrl) {
        const order = await this.findOne(orderId);
        order.transferReceipt = receiptUrl;
        order.transferTime = new Date();
        order.status = order_entity_2.OrderStatus.PENDING_PAID;
        return this.orderRepo.save(order);
    }
    async updateStatus(id, status) {
        const order = await this.findOne(id);
        order.status = status;
        return this.orderRepo.save(order);
    }
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(order_entity_1.Order)),
    __param(1, (0, typeorm_1.InjectRepository)(product_entity_1.Product)),
    __param(2, (0, common_1.Inject)((0, common_1.forwardRef)(() => products_service_1.ProductsService))),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        products_service_1.ProductsService])
], OrdersService);
//# sourceMappingURL=orders.service.js.map