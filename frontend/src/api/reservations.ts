import api from './index'

export const reservationApi = {
  getMyReservations() {
    return api.get('/reservations/my')
  },
  createReservation(productId: string, quantity: number = 1) {
    return api.post('/reservations', { productId, quantity })
  },
  cancelReservation(id: string) {
    return api.delete(`/reservations/${id}`)
  },
}
