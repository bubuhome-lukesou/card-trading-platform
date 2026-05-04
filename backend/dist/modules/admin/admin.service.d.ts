import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { Settings } from '../../entities/settings.entity';
export declare class AdminService {
    private userRepo;
    private settingsRepo;
    constructor(userRepo: Repository<User>, settingsRepo: Repository<Settings>);
    getUsers(page?: number, limit?: number, role?: string): Promise<{
        data: User[];
        total: number;
        page: number;
        limit: number;
    }>;
    getUser(id: string): Promise<User>;
    updateUser(id: string, data: {
        role?: string;
        status?: string;
        nickname?: string;
    }): Promise<User>;
    getStats(): Promise<{
        totalUsers: number;
        totalSellers: number;
        totalAdmins: number;
    }>;
    getSettings(): Promise<Settings>;
    updateSettings(data: {
        pickupInfo?: string;
        pickupQrCode?: string;
    }): Promise<Settings>;
}
