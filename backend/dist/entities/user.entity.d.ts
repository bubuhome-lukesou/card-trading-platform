export declare enum UserRole {
    USER = "user",
    SELLER = "seller",
    ADMIN = "admin"
}
export declare enum UserStatus {
    ACTIVE = "active",
    SUSPENDED = "suspended"
}
export declare class User {
    id: string;
    email: string;
    nickname: string;
    avatar: string;
    role: UserRole;
    status: UserStatus;
    password: string;
    phone: string;
    emailVerificationToken: string;
    emailVerified: boolean;
    balance: number;
    resetPasswordToken: string;
    resetPasswordExpires: Date;
    lastLoginAt: Date;
    pickupInfo: string;
    pickupQrCode: string;
    createdAt: Date;
    updatedAt: Date;
}
