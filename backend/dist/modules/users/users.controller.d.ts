import { UsersService } from './users.service';
export declare class UsersController {
    private usersService;
    constructor(usersService: UsersService);
    getProfile(req: any): Promise<import("../../entities").User>;
    updateProfile(req: any, body: {
        nickname?: string;
        phone?: string;
        avatar?: string;
    }): Promise<import("../../entities").User>;
    updatePassword(req: any, body: {
        currentPassword: string;
        newPassword: string;
    }): Promise<import("../../entities").User>;
    updatePickupInfo(req: any, body: {
        pickupInfo?: string;
        pickupQrCode?: string;
    }): Promise<import("../../entities").User>;
    getSellerPickupInfo(sellerId: string): Promise<{
        pickupInfo: string;
        pickupQrCode: string;
    }>;
}
