export declare enum TransactionType {
    DEPOSIT = "deposit",
    WITHDRAWAL = "withdrawal",
    PAYMENT = "payment",
    RECEIVE = "receive",
    REFUND = "refund",
    PLATFORM_FEE = "platform_fee"
}
export declare class WalletTransaction {
    id: string;
    userId: string;
    amount: number;
    type: TransactionType;
    description: string;
    orderId: string;
    balanceBefore: number;
    balanceAfter: number;
    createdAt: Date;
}
