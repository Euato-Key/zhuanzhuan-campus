import api from '../index'

// ─── Types ───

export interface AuthUser {
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

export interface LoginByPasswordRequest {
  email: string
  password: string
}

export interface LoginByCodeRequest {
  email: string
  code: string
}

export interface LoginResponseData {
  access_token: string
  user: AuthUser
}

export interface RegisterRequest {
  email: string
  code: string
  username: string
  password: string
}

export interface RegisterResponseData {
  id: number
  email: string
  username: string
}

export interface TokenRefreshResponseData {
  access_token: string
}

// ─── API Functions ───

export function sendCode(email: string, type: 'register' | 'login' | 'reset_password' | 'change_email') {
  return api.post<{ code: number; message: string; data: { message: string } }>('/auth/send-code', { email, type })
}

export function register(data: RegisterRequest) {
  return api.post<{ code: number; message: string; data: RegisterResponseData }>('/auth/register', data)
}

export function loginByPassword(email: string, password: string) {
  return api.post<{ code: number; message: string; data: LoginResponseData }>('/auth/login/password', { email, password }, { withCredentials: true })
}

export function loginByCode(email: string, code: string) {
  return api.post<{ code: number; message: string; data: LoginResponseData }>('/auth/login/code', { email, code }, { withCredentials: true })
}

export function refreshToken() {
  return api.post<{ code: number; message: string; data: TokenRefreshResponseData }>('/auth/refresh-token', {}, { withCredentials: true })
}

export function logout() {
  return api.post<{ code: number; message: string; data: null }>('/auth/logout', {}, { withCredentials: true })
}

export function resetPassword(email: string, code: string, newPassword: string) {
  return api.post<{ code: number; message: string; data: { message: string } }>('/auth/reset-password', { email, code, new_password: newPassword })
}

export function getProfile() {
  return api.get<{ code: number; message: string; data: AuthUser }>('/auth/profile')
}
