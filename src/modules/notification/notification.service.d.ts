export interface NotificationPayload {
    userId: string;
    channel: 'email' | 'wechat' | 'in_app';
    template: 'auction_bid' | 'auction_outbid' | 'auction_won' | 'order_created' | 'order_shipped' | 'order_completed';
    data: {
        username?: string;
        auctionTitle?: string;
        bidAmount?: number;
        orderId?: string;
        [key: string]: any;
    };
}
export declare class NotificationService {
    private readonly logger;
    send(payload: NotificationPayload): Promise<boolean>;
    private sendEmail;
    private sendWeChat;
    private sendInApp;
    private buildWeChatMessage;
}
