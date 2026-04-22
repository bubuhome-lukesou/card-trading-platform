import api from '@/api'

export const uploadApi = {
  uploadImage(file: File) {
    const formData = new FormData()
    formData.append('image', file)
    return api.post<{ success: boolean; url: string; filename: string; size: number }>('/upload/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  }
}

