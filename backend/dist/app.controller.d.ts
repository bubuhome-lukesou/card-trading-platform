import { AppService } from './app.service';
import { Settings } from './entities/settings.entity';
import { Repository } from 'typeorm';
export declare class AppController {
    private readonly appService;
    private settingsRepo;
    constructor(appService: AppService, settingsRepo: Repository<Settings>);
    getHello(): string;
    getPublicSettings(): Promise<{
        pickupInfo: string;
        pickupQrCode: string;
    }>;
}
