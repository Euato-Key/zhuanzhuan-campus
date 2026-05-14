import api from './index'

export function sendCode(email: string, type: 'register' | 'login' | 'reset_password' | 'change_email') {
  return api.post('/auth/send-code', { email, type })
}

export function register(data: { email: string; code: string; username: string; password: string }) {
  return api.post('/auth/register', data)
}

export function login(username: string, password: string) {
  return api.post('/auth/login', { username, password }, { withCredentials: true })
}

export function refreshToken() {
  return api.post('/auth/refresh-token', {}, { withCredentials: true })
}

export function logout() {
  return api.post('/auth/logout', {}, { withCredentials: true })
}

export function resetPassword(email: string, code: string, newPassword: string) {
  return api.post('/auth/reset-password', { email, code, new_password: newPassword })
}

export function getProfile() {
  return api.get('/auth/profile')
}