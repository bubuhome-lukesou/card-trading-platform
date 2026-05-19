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
exports.AuctionGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const common_1 = require("@nestjs/common");
let AuctionGateway = class AuctionGateway {
    constructor() {
        this.logger = new common_1.Logger('AuctionGateway');
    }
    handleConnection(client) {
        this.logger.log(`Client connected: ${client.id}`);
    }
    handleDisconnect(client) {
        this.logger.log(`Client disconnected: ${client.id}`);
    }
    handleJoinAuction(client, data) {
        const { auctionId } = data;
        client.join(`auction:${auctionId}`);
        this.logger.log(`Client ${client.id} joined auction:${auctionId}`);
        return { event: 'joined', data: { auctionId } };
    }
    handleLeaveAuction(client, data) {
        const { auctionId } = data;
        client.leave(`auction:${auctionId}`);
        this.logger.log(`Client ${client.id} left auction:${auctionId}`);
        return { event: 'left', data: { auctionId } };
    }
    broadcastBid(auctionId, bid) {
        this.server.to(`auction:${auctionId}`).emit('newBid', {
            auctionId,
            bid,
        });
        this.logger.log(`Broadcast bid ${bid.amount} for auction:${auctionId}`);
    }
    broadcastAuctionEnd(auctionId, winner) {
        this.server.to(`auction:${auctionId}`).emit('auctionEnded', {
            auctionId,
            winner,
        });
        this.logger.log(`Auction ${auctionId} ended`);
    }
    broadcastAuctionCancelled(auctionId, reason) {
        this.server.to(`auction:${auctionId}`).emit('auctionCancelled', {
            auctionId,
            reason,
        });
    }
    sendToUser(userId, notification) {
        this.server.to(`user:${userId}`).emit('notification', notification);
    }
};
exports.AuctionGateway = AuctionGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], AuctionGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('joinAuction'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], AuctionGateway.prototype, "handleJoinAuction", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('leaveAuction'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], AuctionGateway.prototype, "handleLeaveAuction", null);
exports.AuctionGateway = AuctionGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: '*',
        },
        namespace: '/auction',
    })
], AuctionGateway);
//# sourceMappingURL=websocket.gateway.js.map