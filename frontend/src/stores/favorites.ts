import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from './auth'
import { favoritesApi } from '@/api/favorites'

export const useFavoritesStore = defineStore('favorites', () => {
  // Set of favorited product IDs
  const favoritedIds = ref<Set<string>>(new Set())
  const loading = ref(false)

  // Getters
  const isFavorited = (productId: string) => favoritedIds.value.has(productId)
  const favoriteCount = computed(() => favoritedIds.value.size)

  // Load favorites from API
  async function loadFavorites() {
    const auth = useAuthStore()
    if (!auth.isAuthenticated) return

    loading.value = true
    try {
      const res = await favoritesApi.getFavorites(1, 100)
      favoritedIds.value = new Set(res.data.data.map((f: any) => f.productId))
    } catch {
      // silent fail — favorites are not critical
    } finally {
      loading.value = false
    }
  }

  // Toggle favorite state
  async function toggleFavorite(productId: string) {
    const auth = useAuthStore()
    if (!auth.isAuthenticated) {
      // Redirect to login
      window.location.href = '/login'
      return
    }

    const wasFavorited = favoritedIds.value.has(productId)

    // Optimistic update
    if (wasFavorited) {
      favoritedIds.value.delete(productId)
    } else {
      favoritedIds.value.add(productId)
    }

    try {
      if (wasFavorited) {
        await favoritesApi.remove(productId)
      } else {
        await favoritesApi.add(productId)
      }
    } catch {
      // Revert on failure
      if (wasFavorited) {
        favoritedIds.value.add(productId)
      } else {
        favoritedIds.value.delete(productId)
      }
    }
  }

  return {
    favoritedIds,
    loading,
    isFavorited,
    favoriteCount,
    loadFavorites,
    toggleFavorite,
  }
})
