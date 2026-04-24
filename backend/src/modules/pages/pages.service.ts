import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Page, PageType } from '../../../entities/page.entity'
import { UpdatePageDto } from './dto/update-page.dto'

@Injectable()
export class PagesService {
  constructor(
    @InjectRepository(Page)
    private readonly pageRepo: Repository<Page>,
  ) {}

  async findAll(): Promise<Page[]> {
    return this.pageRepo.find()
  }

  async findByType(type: PageType, locale: string = 'zh'): Promise<Page> {
    const page = await this.pageRepo.findOne({ where: { type } })
    if (!page) {
      return this.getDefaultPage(type)
    }
    return page
  }

  async update(dto: UpdatePageDto): Promise<Page> {
    let page = await this.pageRepo.findOne({ where: { type: dto.type } })
    if (!page) {
      page = this.pageRepo.create(dto as any)
    } else {
      Object.assign(page, dto)
    }
    return this.pageRepo.save(page)
  }

  private getDefaultPage(type: PageType): Page {
    const defaults: Record<PageType, Page> = {
      [PageType.HELP]: {
        id: '',
        type: PageType.HELP,
        titleZh: '帮助中心',
        titleEn: 'Help Center',
        contentZh: '<h2>欢迎来到帮助中心</h2><p>这里您可以找到常见问题的解答。</p>',
        contentEn: '<h2>Welcome to Help Center</h2><p>Here you can find answers to frequently asked questions.</p>',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      [PageType.CONTACT]: {
        id: '',
        type: PageType.CONTACT,
        titleZh: '联系我们',
        titleEn: 'Contact Us',
        contentZh: '<h2>联系我们</h2><p>如有任何问题，请通过以下方式联系我们：</p><ul><li>📧 support@cardquest.com</li><li>📱 +853 1234 5678</li><li>📍 澳门</li></ul>',
        contentEn: '<h2>Contact Us</h2><p>If you have any questions, please contact us:</p><ul><li>📧 support@cardquest.com</li><li>📱 +853 1234 5678</li><li>📍 Macau</li></ul>',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      [PageType.FAQ]: {
        id: '',
        type: PageType.FAQ,
        titleZh: '常见问题',
        titleEn: 'FAQ',
        contentZh: '<h2>常见问题</h2><h3>如何购买卡牌？</h3><p>您可以在拍卖或直接购买中选择心仪的卡牌。</p><h3>如何成为卖家？</h3><p>注册后可以在个人中心申请成为卖家。</p>',
        contentEn: '<h2>Frequently Asked Questions</h2><h3>How do I buy cards?</h3><p>You can choose your favorite cards in auction or direct purchase.</p><h3>How do I become a seller?</h3><p>After registration, you can apply to become a seller in your profile.</p>',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    }
    return defaults[type]
  }
}
