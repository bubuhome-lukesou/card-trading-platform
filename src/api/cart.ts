import api from './index';
import type { Product } from '../types';

export interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  createdAt: string;
}

export const cartApi = {
  getCart: () => api.get<CartItem[]>('/cart'),

  addItem: (productId: string, quantity: number = 1) =>
    api.post('/cart/items', { productId, quantity }),

  updateItem: (id: string, quantity: number) =>
    api.patch(`/cart/items/${id}`, { quantity }),

  removeItem: (id: string) => api.delete(`/cart/items/${id}`),

  clearCart: () => api.delete('/cart'),

  uploadTransferReceipt: (orderId: string, file: File) => {
    const formData = new FormData();
    formData.append('receipt', file);
    return api.post(`/orders/${orderId}/transfer-receipt`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  confirmPayment: (orderId: string) => api.post(`/orders/${orderId}/confirm-payment`),
};
