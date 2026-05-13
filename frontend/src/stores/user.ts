import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/api'

interface User {
  id: number
  email: string
  username: string
  avatar?: string
  school?: string
  campus?: string
  phone?: string
  role: string
  creditScore: number
  creditLevel: string
}

export const useUserStore = defineStore('user', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(localStorage.getItem('access_token'))

  const isLoggedIn = computed(() => !!token.value)
  const isAdmin = computed(() => user.value?.role === 'admin' || user.value?.role === 'super_admin')

  async function login(username: string, password: string) {
    const res = await api.post('/auth/login', { username, password })
    token.value = res.data.access_token
    localStorage.setItem('access_token', res.data.access_token)
    await fetchUser()
    return res.data
  }

  async function fetchUser() {
    if (!token.value) return
    try {
      const res = await api.get('/user/info')
      user.value = res.data
    } catch {
      logout()
    }
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem('access_token')
  }

  async function register(data: { email: string; code: string; username: string; password: string }) {
    const res = await api.post('/auth/register', data)
    return res.data
  }

  return {
    user,
    token,
    isLoggedIn,
    isAdmin,
    login,
    logout,
    fetchUser,
    register
  }
})