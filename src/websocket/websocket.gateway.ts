import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/auction',
})
export class AuctionGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('AuctionGateway');

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // Join auction room to receive updates
  @SubscribeMessage('joinAuction')
  handleJoinAuction(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { auctionId: string },
  ) {
    const { auctionId } = data;
    client.join(`auction:${auctionId}`);
    this.logger.log(`Client ${client.id} joined auction:${auctionId}`);
    return { event: 'joined', data: { auctionId } };
  }

  // Leave auction room
  @SubscribeMessage('leaveAuction')
  handleLeaveAuction(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { auctionId: string },
  ) {
    const { auctionId } = data;
    client.leave(`auction:${auctionId}`);
    this.logger.log(`Client ${client.id} left auction:${auctionId}`);
    return { event: 'left', data: { auctionId } };
  }

  // Broadcast new bid to all clients in the auction room
  broadcastBid(auctionId: string, bid: {
    id: string;
    amount: number;
    bidderId: string;
    bidderName: string;
    timestamp: Date;
  }) {
    this.server.to(`auction:${auctionId}`).emit('newBid', {
      auctionId,
      bid,
    });
    this.logger.log(`Broadcast bid ${bid.amount} for auction:${auctionId}`);
  }

  // Broadcast auction ending
  broadcastAuctionEnd(auctionId: string, winner: {
    id: string;
    name: string;
    finalPrice: number;
  }) {
    this.server.to(`auction:${auctionId}`).emit('auctionEnded', {
      auctionId,
      winner,
    });
    this.logger.log(`Auction ${auctionId} ended`);
  }

  // Broadcast auction cancelled
  broadcastAuctionCancelled(auctionId: string, reason: string) {
    this.server.to(`auction:${auctionId}`).emit('auctionCancelled', {
      auctionId,
      reason,
    });
  }

  // Send notification to a specific user
  sendToUser(userId: string, notification: {
    type: 'outbid' | 'won' | 'ended';
    title: string;
    message: string;
    auctionId?: string;
  }) {
    this.server.to(`user:${userId}`).emit('notification', notification);
  }
}
