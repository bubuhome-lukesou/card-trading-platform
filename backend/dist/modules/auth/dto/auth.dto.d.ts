export declare class LoginDto {
    email: string;
    password: string;
}
export declare class RegisterDto {
    email: string;
    nickname: string;
    password: string;
    role?: string;
}
export declare class SellerRegisterDto {
    email: string;
    nickname: string;
    password: string;
    storeName: string;
    storeDescription?: string;
    phone?: string;
    pickupInfo?: string;
    pickupQrCode?: string;
}
export declare class AuthResponseDto {
    user: any;
    accessToken: string;
}
