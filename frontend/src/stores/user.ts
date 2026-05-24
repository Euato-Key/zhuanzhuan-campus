import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  loginByPassword as loginByPasswordApi,
  loginByCode as loginByCodeApi,
  refreshToken as refreshTokenApi,
  logout as logoutApi,
  register as registerApi,
  getProfile as getProfileApi
} from '@/api/modules/auth'
import {
  updateProfile as updateProfileApi,
  changePassword as changePasswordApi,
  changeEmail as changeEmailApi,
  updateAvatar as updateAvatarApi,
  type UserProfile
} from '@/api/modules/user'

interface User {
  id: number
  email: string
  username: string
  avatar: string | null
  role: string
  creditScore: number
  createdAt: string
  school: string | null
  campus: string | null
  phone: string | null
  bio: string | null
}

export const useUserStore = defineStore('user', () => {
  const user = ref<User | null>(null)
  const accessToken = ref<string | null>(localStorage.getItem('access_token'))

  const isLoggedIn = computed(() => !!accessToken.value)
  const isAdmin = computed(() => user.value?.role === 'admin' || user.value?.role === 'super_admin')
  const isSuperAdmin = computed(() => user.value?.role === 'super_admin')

  function setAccessToken(token: string) {
    accessToken.value = token
    localStorage.setItem('access_token', token)
  }

  function clearAuth() {
    accessToken.value = null
    user.value = null
    localStorage.removeItem('access_token')
  }

  async function loginByPassword(email: string, password: string) {
    const res = await loginByPasswordApi(email, password)
    const { access_token, user: userData } = res.data.data
    setAccessToken(access_token)
    user.value = userData
    return userData
  }

  async function loginByCode(email: string, code: string) {
    const res = await loginByCodeApi(email, code)
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

  // ─── Profile management ───

  async function updateProfile(data: {
    username?: string
    school?: string
    campus?: string
    phone?: string
    bio?: string
  }): Promise<UserProfile> {
    const res = await updateProfileApi(data)
    // Update local user data
    if (user.value) {
      user.value = { ...user.value, ...res.data.data }
    }
    return res.data.data
  }

  async function changePassword(oldPassword: string, newPassword: string) {
    await changePasswordApi(oldPassword, newPassword)
    // Password changed - need to re-login, clear auth
    clearAuth()
  }

  async function changeEmail(newEmail: string, code: string) {
    await changeEmailApi(newEmail, code)
    // Email changed - need to re-login, clear auth
    clearAuth()
  }

  async function updateAvatar(tempPath: string): Promise<UserProfile> {
    const res = await updateAvatarApi(tempPath)
    // Update local user data
    if (user.value) {
      user.value = { ...user.value, avatar: res.data.data.avatar }
    }
    return res.data.data
  }

  return {
    user,
    accessToken,
    isLoggedIn,
    isAdmin,
    isSuperAdmin,
    loginByPassword,
    loginByCode,
    register,
    fetchUser,
    refresh,
    logout,
    clearAuth,
    updateProfile,
    changePassword,
    changeEmail,
    updateAvatar,
  }
})