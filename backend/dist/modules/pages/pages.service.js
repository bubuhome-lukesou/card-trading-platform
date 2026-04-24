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
exports.PagesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const page_entity_1 = require("../../entities/page.entity");
let PagesService = class PagesService {
    constructor(pageRepo) {
        this.pageRepo = pageRepo;
    }
    async findAll() {
        return this.pageRepo.find();
    }
    async findByType(type, locale = 'zh') {
        const page = await this.pageRepo.findOne({ where: { type } });
        if (!page) {
            return this.getDefaultPage(type);
        }
        return page;
    }
    async update(dto) {
        let page = await this.pageRepo.findOne({ where: { type: dto.type } });
        if (!page) {
            page = this.pageRepo.create(dto);
        }
        else {
            Object.assign(page, dto);
        }
        return this.pageRepo.save(page);
    }
    getDefaultPage(type) {
        const defaults = {
            [page_entity_1.PageType.HELP]: {
                id: 0,
                type: page_entity_1.PageType.HELP,
                titleZh: '帮助中心',
                titleEn: 'Help Center',
                contentZh: '<h2>欢迎来到帮助中心</h2><p>这里您可以找到常见问题的解答。</p>',
                contentEn: '<h2>Welcome to Help Center</h2><p>Here you can find answers to frequently asked questions.</p>',
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            [page_entity_1.PageType.CONTACT]: {
                id: 0,
                type: page_entity_1.PageType.CONTACT,
                titleZh: '联系我们',
                titleEn: 'Contact Us',
                contentZh: '<h2>联系我们</h2><p>如有任何问题，请通过以下方式联系我们：</p><ul><li>📧 support@cardquest.com</li><li>📱 +853 1234 5678</li><li>📍 澳门</li></ul>',
                contentEn: '<h2>Contact Us</h2><p>If you have any questions, please contact us:</p><ul><li>📧 support@cardquest.com</li><li>📱 +853 1234 5678</li><li>📍 Macau</li></ul>',
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            [page_entity_1.PageType.FAQ]: {
                id: 0,
                type: page_entity_1.PageType.FAQ,
                titleZh: '常见问题',
                titleEn: 'FAQ',
                contentZh: '<h2>常见问题</h2><h3>如何购买卡牌？</h3><p>您可以在拍卖或直接购买中选择心仪的卡牌。</p><h3>如何成为卖家？</h3><p>注册后可以在个人中心申请成为卖家。</p>',
                contentEn: '<h2>Frequently Asked Questions</h2><h3>How do I buy cards?</h3><p>You can choose your favorite cards in auction or direct purchase.</p><h3>How do I become a seller?</h3><p>After registration, you can apply to become a seller in your profile.</p>',
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        };
        return defaults[type];
    }
};
exports.PagesService = PagesService;
exports.PagesService = PagesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(page_entity_1.Page)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], PagesService);
//# sourceMappingURL=pages.service.js.map