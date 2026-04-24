import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm'

export enum PageType {
  HELP = 'help',
  CONTACT = 'contact',
  FAQ = 'faq'
}

@Entity('pages')
export class Page {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'enum', enum: PageType, unique: true })
  type: PageType

  @Column({ type: 'text', default: '' })
  contentZh: string

  @Column({ type: 'text', default: '' })
  contentEn: string

  @Column({ type: 'varchar', length: 255, default: '' })
  titleZh: string

  @Column({ type: 'varchar', length: 255, default: '' })
  titleEn: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
