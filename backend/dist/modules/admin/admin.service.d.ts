import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
export declare class AdminService {
    private userRepo;
    constructor(userRepo: Repository<User>);
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
}
