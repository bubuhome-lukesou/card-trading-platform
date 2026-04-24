import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm'

export enum PageType {
  HELP = 'help',
  CONTACT = 'contact',
  FAQ = 'faq'
}

@Entity('pages')
export class Page {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ type: 'varchar', length: 20, unique: true })
  type: string

  @Column({ type: 'text', nullable: true })
  titleZh: string

  @Column({ type: 'text', nullable: true })
  titleEn: string

  @Column({ type: 'text', nullable: true })
  contentZh: string

  @Column({ type: 'text', nullable: true })
  contentEn: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
