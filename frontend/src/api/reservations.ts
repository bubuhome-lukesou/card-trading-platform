import api from './index'

export const reservationApi = {
  getMyReservations() {
    return api.get('/reservations/my')
  },
  getSellerReservations() {
    return api.get('/reservations/seller')
  },
  createReservation(productId: string, quantity: number = 1) {
    return api.post('/reservations', { productId, quantity })
  },
  cancelReservation(id: string) {
    return api.delete(`/reservations/${id}`)
  },
  confirmDeposit(id: string) {
    return api.post(`/reservations/${id}/confirm-deposit`)
  },
  confirmReservation(id: string) {
    return api.post(`/reservations/${id}/confirm`)
  },
  findByProduct(productId: string) {
    return api.get(`/reservations/product/${productId}`)
  },
}