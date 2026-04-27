import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToMany, JoinTable } from 'typeorm'
import { Product } from './product.entity'

@Entity('tags')
export class Tag {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ unique: true })
  name: string

  @Column({ nullable: true })
  slug: string

  @Column({ nullable: true })
  color: string

  @Column({ default: 1 })
  sortOrder: number

  @CreateDateColumn()
  createdAt: Date

  @ManyToMany(() => Product, product => product.tags)
  products: Product[]
}
