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
exports.BidsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const bids_service_1 = require("./bids.service");
let BidsController = class BidsController {
    constructor(bidsService) {
        this.bidsService = bidsService;
    }
    getMyBids(req, page = '1', limit = '20') {
        return this.bidsService.findByUser(req.user.id, Number(page), Number(limit));
    }
    getAuctionBids(auctionId) {
        return this.bidsService.findByAuction(auctionId);
    }
    createBid(req, body) {
        return this.bidsService.create({
            auctionId: body.auctionId,
            userId: req.user.id,
            amount: body.amount,
        });
    }
};
exports.BidsController = BidsController;
__decorate([
    (0, common_1.Get)('my'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", void 0)
], BidsController.prototype, "getMyBids", null);
__decorate([
    (0, common_1.Get)('auction/:auctionId'),
    __param(0, (0, common_1.Param)('auctionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], BidsController.prototype, "getAuctionBids", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], BidsController.prototype, "createBid", null);
exports.BidsController = BidsController = __decorate([
    (0, common_1.Controller)('bids'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [bids_service_1.BidsService])
], BidsController);
//# sourceMappingURL=bids.controller.js.map