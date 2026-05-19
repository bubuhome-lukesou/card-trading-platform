import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Tag } from '../../entities/tag.entity'
import { CreateTagDto, UpdateTagDto } from './dto/tag.dto'

@Injectable()
export class TagsService {
  constructor(
    @InjectRepository(Tag)
    private readonly tagRepo: Repository<Tag>
  ) {}

  async findAll() {
    return this.tagRepo.find({
      order: { sortOrder: 'ASC', name: 'ASC' }
    })
  }

  async findOne(id: number) {
    const tag = await this.tagRepo.findOne({ where: { id } })
    if (!tag) {
      throw new NotFoundException('Tag not found')
    }
    return tag
  }

  async findBySlug(slug: string) {
    return this.tagRepo.findOne({ where: { slug } })
  }

  async create(dto: CreateTagDto) {
    // Check if tag with same name exists
    const existing = await this.tagRepo.findOne({ where: { name: dto.name } })
    if (existing) {
      throw new ConflictException('Tag with this name already exists')
    }

    // Auto-generate slug if not provided
    if (!dto.slug && dto.name) {
      dto.slug = dto.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    }

    const tag = this.tagRepo.create(dto)
    return this.tagRepo.save(tag)
  }

  async update(id: number, dto: UpdateTagDto) {
    const tag = await this.findOne(id)
    
    if (dto.name && dto.name !== tag.name) {
      const existing = await this.tagRepo.findOne({ where: { name: dto.name } })
      if (existing) {
        throw new ConflictException('Tag with this name already exists')
      }
    }

    Object.assign(tag, dto)
    return this.tagRepo.save(tag)
  }

  async remove(id: number) {
    const tag = await this.findOne(id)
    await this.tagRepo.remove(tag)
  }

  async findOrCreate(names: string[]) {
    const tags: Tag[] = []
    for (const name of names) {
      let tag = await this.tagRepo.findOne({ where: { name } })
      if (!tag) {
        tag = await this.create({ name })
      }
      tags.push(tag)
    }
    return tags
  }
}
