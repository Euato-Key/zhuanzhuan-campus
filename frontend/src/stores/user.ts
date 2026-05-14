import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login as loginApi, register as registerApi, refreshToken as refreshTokenApi, logout as logoutApi, getProfile as getProfileApi } from '@/api/auth'

interface User {
  id: number
  email: string
  username: string
  avatar: string | null
  role: string
  creditScore: number
}

export const useUserStore = defineStore('user', () => {
  const user = ref<User | null>(null)
  const accessToken = ref<string | null>(localStorage.getItem('access_token'))

  const isLoggedIn = computed(() => !!accessToken.value)
  const isAdmin = computed(() => user.value?.role === 'admin' || user.value?.role === 'super_admin')

  function setAccessToken(token: string) {
    accessToken.value = token
    localStorage.setItem('access_token', token)
  }

  function clearAuth() {
    accessToken.value = null
    user.value = null
    localStorage.removeItem('access_token')
  }

  async function login(identifier: string, password: string) {
    const res = await loginApi(identifier, password)
    const { access_token, user: userData } = res.data.data
    setAccessToken(access_token)
    user.value = userData
    return userData
  }

  async function register(data: { email: string; code: string; username: string; password: string }) {
    const res = await registerApi(data)
    return res.data.data
  }

  async function fetchUser() {
    if (!accessToken.value) return
    try {
      const res = await getProfileApi()
      user.value = res.data.data
    } catch {
      clearAuth()
    }
  }

  async function refresh() {
    try {
      const res = await refreshTokenApi()
      const { access_token } = res.data.data
      setAccessToken(access_token)
    } catch {
      clearAuth()
      throw new Error('Refresh failed')
    }
  }

  async function logout() {
    try {
      await logoutApi()
    } finally {
      clearAuth()
    }
  }

  return {
    user,
    accessToken,
    isLoggedIn,
    isAdmin,
    login,
    register,
    fetchUser,
    refresh,
    logout,
    clearAuth,
  }
})