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

  // Admin: Get all applications（後端支援 status/search 篩選，2026-09-20）
  getAllApplications(page = 1, limit = 20, status?: string, search?: string) {
    return api.get('/seller-applications', { params: { page, limit, status, search } })
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