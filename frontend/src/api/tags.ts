import api from '@/api'
import type { Tag } from '@/types'

export const tagApi = {
  // Get all tags
  getTags() {
    return api.get<Tag[]>('/tags')
  },

  // Get single tag
  getTag(id: number) {
    return api.get<Tag>(`/tags/${id}`)
  },

  // Create tag (admin only)
  createTag(data: { name: string; slug?: string; color?: string; sortOrder?: number }) {
    return api.post<Tag>('/tags', data)
  },

  // Update tag (admin only)
  updateTag(id: number, data: { name?: string; slug?: string; color?: string; sortOrder?: number }) {
    return api.put<Tag>(`/tags/${id}`, data)
  },

  // Delete tag (admin only)
  deleteTag(id: number) {
    return api.delete(`/tags/${id}`)
  }
}
