import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User, LoginRequest, RegisterRequest } from '@/types'
import api from '@/api'

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref<User | null>(null)
  const token = ref<string | null>(localStorage.getItem('token'))
  // Persist role so it survives page reload (avoids race condition with fetchUser)
  const role = ref<User['role'] | null>((localStorage.getItem('role') as User['role']) || null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const isAuthenticated = computed(() => !!token.value)
  const isSeller = computed(() => role.value === 'seller')
  const isAdmin = computed(() => role.value === 'admin')
  const currentUser = computed(() => user.value)

  // Actions
  async function login(credentials: LoginRequest) {
    loading.value = true
    error.value = null

    try {
      const response = await api.post<{ accessToken: string; user: User }>('/auth/login', credentials)
      token.value = response.data.accessToken
      user.value = response.data.user
      role.value = response.data.user.role
      localStorage.setItem('token', response.data.accessToken)
      localStorage.setItem('role', response.data.user.role)
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
      const response = await api.post('/auth/register', data)
      // Support both {accessToken, user} and {data: {accessToken, user}} formats
      const result = (response.data as any)?.data || response.data
      const accessToken = result.accessToken
      const userData = result.user
      
      if (!accessToken) {
        console.error('Register: No accessToken in response', response.data)
        error.value = 'Registration failed: No token received'
        return false
      }
      
      token.value = accessToken
      user.value = userData
      role.value = userData.role
      localStorage.setItem('token', accessToken)
      localStorage.setItem('role', userData.role)
      api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
      return true
    } catch (err: any) {
      console.error('Register error:', err)
      error.value = err.response?.data?.message || err.message || 'Registration failed'
      return false
    } finally {
      loading.value = false
    }
  }

  async function fetchUser() {
    if (!token.value) return

    try {
      api.defaults.headers.common['Authorization'] = `Bearer ${token.value}`
      const response = await api.get<User>('/auth/profile')
      user.value = response.data
      role.value = response.data.role
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
    role.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('role')
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
