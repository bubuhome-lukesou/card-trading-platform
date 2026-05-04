import api from './index'

export const adminApi = {
  getSettings: () => api.get('/admin/settings'),
  updateSettings: (data: { pickupInfo?: string; pickupQrCode?: string }) =>
    api.patch('/admin/settings', data),
}
