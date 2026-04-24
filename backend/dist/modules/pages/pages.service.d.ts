import { Repository } from 'typeorm';
import { Page, PageType } from '../../entities/page.entity';
import { UpdatePageDto } from './dto/update-page.dto';
export declare class PagesService {
    private readonly pageRepo;
    constructor(pageRepo: Repository<Page>);
    findAll(): Promise<any[]>;
    findByType(type: PageType, locale?: string): Promise<any>;
    update(dto: UpdatePageDto): Promise<any>;
    private getDefaultPage;
}
