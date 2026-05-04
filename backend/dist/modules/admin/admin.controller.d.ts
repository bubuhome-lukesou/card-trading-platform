import { AdminService } from './admin.service';
export declare class AdminController {
    private adminService;
    constructor(adminService: AdminService);
    getUsers(page?: string, limit?: string, role?: string): Promise<{
        data: import("../../entities").User[];
        total: number;
        page: number;
        limit: number;
    }>;
    getUser(id: string): Promise<import("../../entities").User>;
    updateUser(id: string, body: {
        role?: string;
        status?: string;
        nickname?: string;
    }): Promise<import("../../entities").User>;
    getStats(): Promise<{
        totalUsers: number;
        totalSellers: number;
        totalAdmins: number;
    }>;
    getSettings(): Promise<import("../../entities").Settings>;
    updateSettings(body: {
        pickupInfo?: string;
        pickupQrCode?: string;
    }): Promise<import("../../entities").Settings>;
}
