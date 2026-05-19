import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
export declare class AuctionGateway implements OnGatewayConnection, OnGatewayDisconnect {
    server: Server;
    private logger;
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    handleJoinAuction(client: Socket, data: {
        auctionId: string;
    }): {
        event: string;
        data: {
            auctionId: string;
        };
    };
    handleLeaveAuction(client: Socket, data: {
        auctionId: string;
    }): {
        event: string;
        data: {
            auctionId: string;
        };
    };
    broadcastBid(auctionId: string, bid: {
        id: string;
        amount: number;
        bidderId: string;
        bidderName: string;
        timestamp: Date;
    }): void;
    broadcastAuctionEnd(auctionId: string, winner: {
        id: string;
        name: string;
        finalPrice: number;
    }): void;
    broadcastAuctionCancelled(auctionId: string, reason: string): void;
    sendToUser(userId: string, notification: {
        type: 'outbid' | 'won' | 'ended';
        title: string;
        message: string;
        auctionId?: string;
    }): void;
}
