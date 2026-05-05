import api from './index'

export const sellerApplicationApi = {
  // Submit seller application (with account info)
  submitApplication(data: {
    email: string
    nickname: string
    password: string
    storeName: string
    storeDescription?: string
    phone?: string
    pickupInfo?: string
    pickupQrCode?: string
  }) {
    return api.post('/seller-applications', data)
  },

  // Get application status by email
  getStatusByEmail(email: string) {
    return api.get('/seller-applications/status', { params: { email } })
  },

  // Admin: Get pending applications
  getPendingApplications() {
    return api.get('/seller-applications/pending')
  },

  // Admin: Get all applications
  getAllApplications(page = 1, limit = 20) {
    return api.get('/seller-applications', { params: { page, limit } })
  },

  // Admin: Approve application
  approve(applicationId: string) {
    return api.patch(`/seller-applications/${applicationId}/approve`)
  },

  // Admin: Reject application
  reject(applicationId: string, reason?: string) {
    return api.patch(`/seller-applications/${applicationId}/reject`, { reason })
  },
}
