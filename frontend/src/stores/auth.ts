import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User, LoginRequest, RegisterRequest } from '@/types'
import api from '@/api'

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref<User | null>(null)
  const token = ref<string | null>(localStorage.getItem('token'))
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const isAuthenticated = computed(() => !!token.value && !!user.value)
  const isSeller = computed(() => user.value?.role === 'seller' || user.value?.role === 'admin')
  const isAdmin = computed(() => user.value?.role === 'admin')
  const currentUser = computed(() => user.value)

  // Actions
  async function login(credentials: LoginRequest) {
    loading.value = true
    error.value = null

    try {
      const response = await api.post<{ accessToken: string; user: User }>('/auth/login', credentials)
      token.value = response.data.accessToken
      user.value = response.data.user
      localStorage.setItem('token', response.data.accessToken)
      api.defaults.headers.common['Authorization'] = `Bearer ${response.data.accessToken}`
      return true
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Login failed'
      return false
    } finally {
      loading.value = false
    }
  }

  async function register(data: RegisterRequest) {
    loading.value = true
    error.value = null

    try {
      const response = await api.post<{ accessToken: string; user: User }>('/auth/register', data)
      token.value = response.data.accessToken
      user.value = response.data.user
      localStorage.setItem('token', response.data.accessToken)
      api.defaults.headers.common['Authorization'] = `Bearer ${response.data.accessToken}`
      return true
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Registration failed'
      return false
    } finally {
      loading.value = false
    }
  }

  async function fetchUser() {
    if (!token.value) return

    try {
      api.defaults.headers.common['Authorization'] = `Bearer ${token.value}`
      const response = await api.get<User>('/auth/me')
      user.value = response.data
    } catch {
      logout()
    }
  }

  async function updateProfile(data: Partial<User>) {
    loading.value = true
    error.value = null

    try {
      const response = await api.patch<User>('/users/profile', data)
      user.value = response.data
      return true
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Update failed'
      return false
    } finally {
      loading.value = false
    }
  }

  function logout() {
    user.value = null
    token.value = null
    localStorage.removeItem('token')
    delete api.defaults.headers.common['Authorization']
  }

  // Initialize
  if (token.value) {
    fetchUser()
  }

  return {
    // State
    user,
    token,
    loading,
    error,
    // Getters
    isAuthenticated,
    isSeller,
    isAdmin,
    currentUser,
    // Actions
    login,
    register,
    fetchUser,
    updateProfile,
    logout
  }
})
