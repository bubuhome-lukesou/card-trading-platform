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
exports.NotificationController = exports.SendNotificationDto = exports.NotificationDto = void 0;
const common_1 = require("@nestjs/common");
class NotificationDto {
}
exports.NotificationDto = NotificationDto;
class SendNotificationDto {
}
exports.SendNotificationDto = SendNotificationDto;
let NotificationController = class NotificationController {
    constructor() {
        this.notifications = new Map();
    }
    async sendNotification(dto) {
        switch (dto.channel) {
            case 'email':
                console.log(`[EMAIL] To: ${dto.userId}, Title: ${dto.title}, Message: ${dto.message}`);
                break;
            case 'wechat':
                console.log(`[WECHAT] To: ${dto.userId}, Title: ${dto.title}, Message: ${dto.message}`);
                break;
            case 'in_app':
                const userNotifications = this.notifications.get(dto.userId) || [];
                userNotifications.unshift({
                    id: `notif-${Date.now()}`,
                    ...dto,
                    read: false,
                    createdAt: new Date(),
                });
                this.notifications.set(dto.userId, userNotifications);
                break;
        }
        return {
            success: true,
            message: `Notification queued for ${dto.channel}`,
            notificationId: `notif-${Date.now()}`,
        };
    }
    async getNotifications(userId) {
        return {
            notifications: this.notifications.get(userId) || [],
        };
    }
    async markAsRead(body) {
        const userNotifications = this.notifications.get(body.userId) || [];
        const notification = userNotifications.find(n => n.id === body.notificationId);
        if (notification) {
            notification.read = true;
        }
        return { success: true };
    }
};
exports.NotificationController = NotificationController;
__decorate([
    (0, common_1.Post)('send'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [SendNotificationDto]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "sendNotification", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "getNotifications", null);
__decorate([
    (0, common_1.Post)('read'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "markAsRead", null);
exports.NotificationController = NotificationController = __decorate([
    (0, common_1.Controller)('notifications')
], NotificationController);
//# sourceMappingURL=notification.controller.js.map