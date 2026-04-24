import axios, { type AxiosInstance, type AxiosError } from 'axios'
import router from '@/router'
import { useAuthStore } from '@/stores/auth'

const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  },
  // Use comma-separated array format (e.g. category=pokemon,yugioh)
  // instead of bracket notation (e.g. category[]=pokemon&category[]=yugioh)
  paramsSerializer: (params) => {
    const parts: string[] = []
    for (const key of Object.keys(params)) {
      const val = (params as any)[key]
      if (val === undefined || val === null) continue
      if (Array.isArray(val)) {
        parts.push(`${key}=${val.map(v => encodeURIComponent(String(v))).join(',')}`)
      } else {
        parts.push(`${key}=${encodeURIComponent(String(val))}`)
      }
    }
    return parts.join('&')
  }
})

// Request interceptor - attach token
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor - handle 401
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Use auth store logout to properly clear all state
      const authStore = useAuthStore()
      authStore.logout()
      router.push('/login')
    }
    return Promise.reject(error)
  }
)

export default api
