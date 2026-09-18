import api from './index'

export interface CreateOrderDto {
  productId: string
  type?: 'direct_purchase'
  quantity?: number
  shippingAddress?: string
}

export const ordersApi = {
  getMyOrders() {
    return api.get('/orders')
  },
  // Get seller's orders (with auth) — default limit 200 so product-filter view shows all orders of a product
  getSellerOrders(page = 1, limit = 200) {
    return api.get('/orders/seller', { params: { page, limit } })
  },
  getOrder(id: string) {
    return api.get(`/orders/${id}`)
  },
  createOrder(data: CreateOrderDto) {
    return api.post('/orders', data)
  },
  updateStatus(id: string, status: string) {
    return api.patch(`/orders/${id}/status`, { status })
  },
  confirmPayment(id: string) {
    return api.post(`/orders/${id}/confirm-payment`)
  },
  uploadTransferReceipt(id: string, file: File) {
    const formData = new FormData()
    formData.append('receipt', file)
    return api.post(`/orders/${id}/transfer-receipt`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  uploadBalanceReceipt(id: string, file: File) {
    const formData = new FormData()
    formData.append('receipt', file)
    return api.post(`/orders/${id}/balance-receipt`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}