import api from './index'

export interface CreateOrderDto {
  productId: string
  type: 'direct_purchase' | 'buy_now' | 'auction_win'
  quantity?: number
  totalPrice?: number
  shippingCost?: number
  platformFee?: number
  shippingAddress?: string
  trackingNumber?: string
}

export const ordersApi = {
  getMyOrders() {
    return api.get('/orders')
  },
  getSellerOrders() {
    return api.get('/orders/seller')
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
}
