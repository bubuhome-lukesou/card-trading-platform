import api from '@/api'
import type { Reservation } from '@/types'

export const reservationApi = {
  // Create reservation
  createReservation(data: { productId: string }) {
    return api.post<Reservation>('/reservations', data)
  },

  // Get my reservations
  getMyReservations() {
    return api.get<Reservation[]>('/reservations')
  },

  // Cancel reservation
  cancelReservation(id: string) {
    return api.delete(`/reservations/${id}`)
  },
}
