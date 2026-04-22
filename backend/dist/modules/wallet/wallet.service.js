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
exports.WalletService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const wallet_entity_1 = require("../../entities/wallet.entity");
const user_entity_1 = require("../../entities/user.entity");
let WalletService = class WalletService {
    constructor(txRepo, userRepo) {
        this.txRepo = txRepo;
        this.userRepo = userRepo;
    }
    async getBalance(userId) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        return { balance: user?.balance ?? 0 };
    }
    async getTransactions(userId, page = 1, limit = 20) {
        const [data, total] = await this.txRepo.findAndCount({
            where: { userId },
            order: { createdAt: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });
        return { data, total, page, limit };
    }
    async deposit(userId, amount, description = 'Deposit') {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        const balanceBefore = Number(user.balance);
        user.balance = balanceBefore + amount;
        await this.userRepo.save(user);
        const tx = this.txRepo.create({
            userId, amount, type: wallet_entity_1.TransactionType.DEPOSIT,
            description, balanceBefore, balanceAfter: Number(user.balance),
        });
        return this.txRepo.save(tx);
    }
    async withdraw(userId, amount, description = 'Withdrawal') {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (Number(user.balance) < amount)
            throw new Error('Insufficient balance');
        const balanceBefore = Number(user.balance);
        user.balance = balanceBefore - amount;
        await this.userRepo.save(user);
        const tx = this.txRepo.create({
            userId, amount: -amount, type: wallet_entity_1.TransactionType.WITHDRAWAL,
            description, balanceBefore, balanceAfter: Number(user.balance),
        });
        return this.txRepo.save(tx);
    }
};
exports.WalletService = WalletService;
exports.WalletService = WalletService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(wallet_entity_1.WalletTransaction)),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], WalletService);
//# sourceMappingURL=wallet.service.js.map