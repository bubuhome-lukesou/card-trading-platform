"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const bcrypt = __importStar(require("bcrypt"));
const user_entity_1 = require("../../entities/user.entity");
const settings_entity_1 = require("../../entities/settings.entity");
let AdminService = class AdminService {
    constructor(userRepo, settingsRepo) {
        this.userRepo = userRepo;
        this.settingsRepo = settingsRepo;
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
    async getSettings() {
        let settings = await this.settingsRepo.findOne({ where: { id: 1 } });
        if (!settings) {
            settings = this.settingsRepo.create({ id: 1, pickupInfo: '', pickupQrCode: '' });
            settings = await this.settingsRepo.save(settings);
        }
        return settings;
    }
    async updateSettings(data) {
        const settings = await this.getSettings();
        if (data.pickupInfo !== undefined)
            settings.pickupInfo = data.pickupInfo;
        if (data.pickupQrCode !== undefined)
            settings.pickupQrCode = data.pickupQrCode;
        return this.settingsRepo.save(settings);
    }
    async changePassword(userId, currentPassword, newPassword) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user)
            throw new Error('User not found');
        if (user.password) {
            const isValid = await bcrypt.compare(currentPassword, user.password);
            if (!isValid)
                throw new Error('當前密碼不正確');
        }
        user.password = await bcrypt.hash(newPassword, 10);
        await this.userRepo.save(user);
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(settings_entity_1.Settings)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], AdminService);
//# sourceMappingURL=admin.service.js.map