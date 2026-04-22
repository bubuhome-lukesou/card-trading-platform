import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
export declare class UsersService {
    private userRepo;
    constructor(userRepo: Repository<User>);
    findById(id: string): Promise<User>;
    findByEmail(email: string): Promise<User | null>;
    updateProfile(id: string, data: {
        nickname?: string;
        phone?: string;
        avatar?: string;
    }): Promise<User>;
    updatePassword(id: string, currentPassword: string, newPassword: string): Promise<User>;
    updateBalance(id: string, amount: number): Promise<User>;
    findAll(page?: number, limit?: number): Promise<{
        data: User[];
        total: number;
        page: number;
        limit: number;
    }>;
    updateRole(id: string, role: string): Promise<User>;
}
