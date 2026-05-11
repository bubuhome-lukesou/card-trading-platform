import api from './index'

export const adminApi = {
  getSettings: () => api.get('/admin/settings'),
  updateSettings: (data: { pickupInfo?: string; pickupQrCode?: string }) =>
    api.patch('/admin/settings', data),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.patch('/admin/password', data),
}
