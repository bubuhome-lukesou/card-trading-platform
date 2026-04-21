import api from '@/api'

export interface CardRecognitionResult {
  titleEn?: string
  titleZh?: string
  descriptionEn?: string
  descriptionZh?: string
  category?: string
  rarity?: string
  condition?: string
  brand?: string
  series?: string
  cardNumber?: string
}

export const aiApi = {
  recognizeCard(imageUrl: string) {
    return api.post<{ success: boolean; data?: CardRecognitionResult; error?: string }>('/ai/recognize-card', { imageUrl })
  }
}
