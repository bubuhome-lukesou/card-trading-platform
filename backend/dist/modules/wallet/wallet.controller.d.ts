import { WalletService } from './wallet.service';
export declare class WalletController {
    private walletService;
    constructor(walletService: WalletService);
    getBalance(req: any): Promise<{
        balance: number;
    }>;
    getTransactions(req: any, page?: string, limit?: string): Promise<{
        data: import("../../entities/wallet.entity").WalletTransaction[];
        total: number;
        page: number;
        limit: number;
    }>;
    deposit(req: any, amount: number, description: string): Promise<import("../../entities/wallet.entity").WalletTransaction>;
    withdraw(req: any, amount: number, description: string): Promise<import("../../entities/wallet.entity").WalletTransaction>;
}
