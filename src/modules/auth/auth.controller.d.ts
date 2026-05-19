import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    register(dto: RegisterDto): Promise<import("./dto/auth.dto").AuthResponseDto>;
    login(dto: LoginDto): Promise<import("./dto/auth.dto").AuthResponseDto>;
    getProfile(req: any): Promise<import("../../entities").User>;
}
