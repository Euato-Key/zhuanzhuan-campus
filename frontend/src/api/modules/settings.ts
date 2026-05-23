import api from '../index'

export interface SystemSettings {
  ai_audit_enabled: boolean
  ai_audit_first_publish: boolean
  ai_audit_edit: boolean
  ai_publish_enabled: boolean
  ai_context_window: number
}

export interface SettingsResponse {
  code: number
  message: string
  data: SystemSettings
}

export function getSettings() {
  return api.get<SettingsResponse>('/settings')
}

export function updateSettings(data: Partial<SystemSettings>) {
  return api.put<SettingsResponse>('/settings', data)
}
