import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CartItem } from '../../entities/cart-item.entity';
import { Product } from '../../entities/product.entity';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(CartItem)
    private cartRepo: Repository<CartItem>,
    @InjectRepository(Product)
    private productRepo: Repository<Product>,
  ) {}

  async findAll(userId: string): Promise<CartItem[]> {
    return this.cartRepo.find({
      where: { user: { id: userId } as any },
      relations: ['product'],
      order: { createdAt: 'DESC' },
    });
  }

  async addItem(userId: string, productId: string, quantity: number = 1): Promise<CartItem> {
    const product = await this.productRepo.findOne({ where: { id: productId } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Check stock limit
    const currentQty = product.quantity ?? 0;
    if (currentQty <= 0) {
      throw new NotFoundException('Out of stock');
    }

    // Check if item already in cart
    const existing = await this.cartRepo.findOne({
      where: { user: { id: userId } as any, product: { id: productId } as any },
    });

    if (existing) {
      const newQty = existing.quantity + quantity;
      if (newQty > currentQty) {
        throw new NotFoundException(`Only ${currentQty} items available`);
      }
      existing.quantity = newQty;
      return this.cartRepo.save(existing);
    }

    // Check if requested quantity exceeds stock
    if (quantity > currentQty) {
      throw new NotFoundException(`Only ${currentQty} items available`);
    }

    const cartItem = this.cartRepo.create({
      user: { id: userId } as any,
      product: { id: productId } as any,
      quantity,
    });
    return this.cartRepo.save(cartItem);
  }

  async removeItem(id: string, userId: string): Promise<void> {
    const item = await this.cartRepo.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!item) {
      throw new NotFoundException('Cart item not found');
    }
    if (item.user.id !== userId) {
      throw new NotFoundException('Cart item not found');
    }
    await this.cartRepo.remove(item);
  }

  async clearCart(userId: string): Promise<void> {
    const items = await this.cartRepo.find({
      where: { user: { id: userId } as any },
    });
    await this.cartRepo.remove(items);
  }
}
