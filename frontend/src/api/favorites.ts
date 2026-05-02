import api from './index'
import type { Product } from '../types'

export interface FavoriteItem {
  id: string
  productId: string
  product: Product
  addedAt: string
}

export const favoritesApi = {
  // Get all favorites for current user
  getFavorites: (page = 1, limit = 20) =>
    api.get<{ data: FavoriteItem[]; total: number; page: number; limit: number }>('/favorites', { params: { page, limit } }),

  // Add to favorites
  add: (productId: string) =>
    api.post('/favorites', { productId }),

  // Remove from favorites
  remove: (productId: string) =>
    api.delete('/favorites', { data: { productId } }),

  // Check if product is favorited
  check: (productId: string) =>
    api.get<{ isFavorite: boolean }>('/favorites/check', { params: { productId } }),
}
