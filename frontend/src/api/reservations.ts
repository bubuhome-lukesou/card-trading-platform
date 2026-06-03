import api from './index'

export const reservationApi = {
  getMyReservations() {
    return api.get('/reservations/my')
  },
  createReservation(productId: string, depositAmount?: number) {
    return api.post('/reservations', { productId, depositAmount })
  },
  cancelReservation(id: string) {
    return api.delete(`/reservations/${id}`)
  },
}