// 商家介紹頁 API
import api from './index'

export interface SellerProfileData {
  user: {
    id: string
    nickname: string
    avatar: string | null
    createdAt: string
  }
  profile: {
    logo: string | null
    banner: string | null
    descriptionZh: string | null
    descriptionEn: string | null
    businessHours: string | null
    wechatId: string | null
    wechatQrCode: string | null
    location: string | null
    verified: boolean
  } | null
  stats: {
    total: number
    auction: number
    reservation: number
    sale: number
  }
}

export const sellerProfilesApi = {
  // 公開：商家介紹頁
  async getPublicProfile(sellerId: string): Promise<SellerProfileData> {
    const res = await api.get(`/sellers/${sellerId}/profile`)
    return res.data
  },

  // 賣家：讀自己 profile（表單初始化）
  async getMyProfile(): Promise<{ profile: Partial<SellerProfileData['profile']> }> {
    const res = await api.get('/sellers/me/profile')
    return res.data
  },

  // 賣家：更新自己 profile
  async updateMyProfile(data: Partial<SellerProfileData['profile']>) {
    const res = await api.patch('/sellers/me/profile', data)
    return res.data
  }
}