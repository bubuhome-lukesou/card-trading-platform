export declare class NotificationDto {
    userId: string;
    type: 'email' | 'wechat' | 'in_app';
    template: string;
    data: Record<string, any>;
}
export declare class SendNotificationDto {
    userId: string;
    channel: 'email' | 'wechat' | 'in_app';
    title: string;
    message: string;
    metadata?: Record<string, any>;
}
export declare class NotificationController {
    private notifications;
    sendNotification(dto: SendNotificationDto): Promise<{
        success: boolean;
        message: string;
        notificationId: string;
    }>;
    getNotifications(userId: string): Promise<{
        notifications: any[];
    }>;
    markAsRead(body: {
        userId: string;
        notificationId: string;
    }): Promise<{
        success: boolean;
    }>;
}
