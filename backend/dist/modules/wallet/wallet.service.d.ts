import { Repository } from 'typeorm';
import { WalletTransaction } from '../../entities/wallet.entity';
import { User } from '../../entities/user.entity';
export declare class WalletService {
    private txRepo;
    private userRepo;
    constructor(txRepo: Repository<WalletTransaction>, userRepo: Repository<User>);
    getBalance(userId: string): Promise<{
        balance: number;
    }>;
    getTransactions(userId: string, page?: number, limit?: number): Promise<{
        data: WalletTransaction[];
        total: number;
        page: number;
        limit: number;
    }>;
    deposit(userId: string, amount: number, description?: string): Promise<WalletTransaction>;
    withdraw(userId: string, amount: number, description?: string): Promise<WalletTransaction>;
}
