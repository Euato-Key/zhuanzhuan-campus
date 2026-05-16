import axios from 'axios'
import { useUserStore } from '@/stores/user'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 15000,
  withCredentials: true,
})

let isRefreshing = false
let pendingRequests: Array<(token: string | null) => void> = []

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // 401 and not a retry — try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      // If this is already a refresh request or we have no token, just fail
      if (originalRequest.url?.includes('/auth/refresh-token') || !localStorage.getItem('access_token')) {
        const userStore = useUserStore()
        userStore.clearAuth()
        return Promise.reject(error)
      }

      if (isRefreshing) {
        return new Promise((resolve) => {
          pendingRequests.push((token: string | null) => {
            if (token) {
              originalRequest.headers.Authorization = `Bearer ${token}`
              resolve(api(originalRequest))
            } else {
              resolve(Promise.reject(error))
            }
          })
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const userStore = useUserStore()
        await userStore.refresh()
        const newToken = localStorage.getItem('access_token')
        pendingRequests.forEach((cb) => cb(newToken))
        pendingRequests = []
        if (newToken) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`
          return api(originalRequest)
        }
        return Promise.reject(error)
      } catch {
        pendingRequests = []
        const userStore = useUserStore()
        userStore.clearAuth()
        return Promise.reject(error)
      } finally {
        isRefreshing = false
      }
    }

    // For other errors, let the page handle the message
    return Promise.reject(error)
  }
)

export default api
