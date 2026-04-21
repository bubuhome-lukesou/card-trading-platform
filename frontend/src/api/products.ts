import api from '@/api'
import type { Product, ProductFilters, ProductSearchResponse } from '@/types'

export const productApi = {
  // Get products with filters
  getProducts(params: ProductFilters) {
    return api.get<ProductSearchResponse>('/products', { params })
  },

  // Get single product
  getProduct(id: string) {
    return api.get<Product>(`/products/${id}`)
  },

  // Create product (seller only)
  createProduct(data: any) {
    return api.post<Product>('/products', data)
  },

  // Update product (seller only)
  updateProduct(id: string, data: any) {
    return api.patch<Product>(`/products/${id}`, data)
  },

  // Delete product (seller only)
  deleteProduct(id: string) {
    return api.delete(`/products/${id}`)
  },

  // Get seller's products
  getMyProducts(params?: { page?: number; limit?: number }) {
    return api.get<Product[]>('/products/my', { params })
  }
}
