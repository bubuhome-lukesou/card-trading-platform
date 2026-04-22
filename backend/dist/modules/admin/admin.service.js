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
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_entity_1 = require("../../entities/user.entity");
let AdminService = class AdminService {
    constructor(userRepo) {
        this.userRepo = userRepo;
    }
    async getUsers(page = 1, limit = 20, role) {
        const where = {};
        if (role)
            where.role = role;
        const [data, total] = await this.userRepo.findAndCount({
            where,
            order: { createdAt: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });
        return { data, total, page, limit };
    }
    async getUser(id) {
        return this.userRepo.findOne({ where: { id } });
    }
    async updateUser(id, data) {
        const user = await this.userRepo.findOne({ where: { id } });
        if (!user)
            throw new Error('User not found');
        if (data.role)
            user.role = data.role;
        if (data.status)
            user.status = data.status;
        if (data.nickname)
            user.nickname = data.nickname;
        return this.userRepo.save(user);
    }
    async getStats() {
        const totalUsers = await this.userRepo.count();
        const totalSellers = await this.userRepo.count({ where: { role: user_entity_1.UserRole.SELLER } });
        const totalAdmins = await this.userRepo.count({ where: { role: user_entity_1.UserRole.ADMIN } });
        return { totalUsers, totalSellers, totalAdmins };
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], AdminService);
//# sourceMappingURL=admin.service.js.map