import api from '../index'

// ─── User API ───

export interface UserProfile {
  id: number
  email: string
  username: string
  avatar: string | null
  bio: string | null
  school: string | null
  campus: string | null
  phone: string | null
  role: string
  creditScore: number
  createdAt: string
}

export interface PublicProfile {
  id: number
  username: string
  avatar: string | null
  bio: string | null
  school: string | null
  campus: string | null
  creditScore: number
  createdAt: string
}

export function updateProfile(data: {
  username?: string
  school?: string
  campus?: string
  phone?: string
  bio?: string
}) {
  return api.put<{ code: number; message: string; data: UserProfile }>('/users/profile', data)
}

export function changePassword(oldPassword: string, newPassword: string) {
  return api.put<{ code: number; message: string }>('/users/password', { oldPassword, newPassword })
}

export function changeEmail(newEmail: string, code: string) {
  return api.put<{ code: number; message: string }>('/users/email', { newEmail, code })
}

export function updateAvatar(tempPath: string) {
  return api.put<{ code: number; message: string; data: UserProfile }>('/users/avatar', { tempPath })
}

export function getPublicProfile(userId: number) {
  return api.get<{ code: number; message: string; data: PublicProfile }>(`/users/${userId}`)
}