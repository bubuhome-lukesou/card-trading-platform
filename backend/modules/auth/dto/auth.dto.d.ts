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
export declare class AuthResponseDto {
    user: any;
    accessToken: string;
}
