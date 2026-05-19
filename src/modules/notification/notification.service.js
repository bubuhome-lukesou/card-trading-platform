"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const common_1 = require("@nestjs/common");
let NotificationService = class NotificationService {
    constructor() {
        this.logger = new common_1.Logger('NotificationService');
    }
    async send(payload) {
        this.logger.log(`Sending ${payload.channel} notification to user ${payload.userId}`);
        try {
            switch (payload.channel) {
                case 'email':
                    return await this.sendEmail(payload);
                case 'wechat':
                    return await this.sendWeChat(payload);
                case 'in_app':
                    return await this.sendInApp(payload);
                default:
                    return false;
            }
        }
        catch (error) {
            this.logger.error(`Failed to send notification: ${error.message}`);
            return false;
        }
    }
    async sendEmail(payload) {
        this.logger.warn(`[EMAIL] Would send "${payload.template}" email to ${payload.userId}`);
        return true;
    }
    async sendWeChat(payload) {
        this.logger.warn(`[WECHAT] Would send "${payload.template}" message to ${payload.userId}`);
        return true;
    }
    async sendInApp(payload) {
        this.logger.log(`[IN-APP] Notification stored for ${payload.userId}: ${payload.template}`);
        return true;
    }
    buildWeChatMessage(payload) {
        const messageBuilders = {
            auction_bid: () => ({
                msgtype: 'text',
                text: {
                    content: `🔨 您关注的拍卖有新出价！\n\n商品: ${payload.data.auctionTitle}\n金额: HK$ ${payload.data.bidAmount}\n时间: ${new Date().toLocaleString('zh-CN')}`,
                },
            }),
            auction_outbid: () => ({
                msgtype: 'text',
                text: {
                    content: `⚠️ 您已被超越！\n\n商品: ${payload.data.auctionTitle}\n当前最高: HK$ ${payload.data.bidAmount}\n\n快去加价吧！`,
                },
            }),
            auction_won: () => ({
                msgtype: 'news',
                news: {
                    articles: [
                        {
                            title: '🎉 恭喜中标！',
                            description: `您以 HK$ ${payload.data.bidAmount} 成功拍得「${payload.data.auctionTitle}」`,
                            url: `${process.env.FRONTEND_URL}/user/orders`,
                        },
                    ],
                },
            }),
        };
        const builder = messageBuilders[payload.template];
        return builder ? builder() : { msgtype: 'text', text: { content: payload.data.message || '' } };
    }
};
exports.NotificationService = NotificationService;
exports.NotificationService = NotificationService = __decorate([
    (0, common_1.Injectable)()
], NotificationService);
//# sourceMappingURL=notification.service.js.map