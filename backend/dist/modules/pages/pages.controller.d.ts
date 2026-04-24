import { PagesService } from './pages.service';
import { UpdatePageDto } from './dto/update-page.dto';
export declare class PagesController {
    private readonly pagesService;
    constructor(pagesService: PagesService);
    findAll(): Promise<any[]>;
    findOne(type: string, locale?: string): Promise<any>;
    update(dto: UpdatePageDto): Promise<any>;
}
