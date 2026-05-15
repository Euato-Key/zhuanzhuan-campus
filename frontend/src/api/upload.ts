import api from './index'

// ─── Upload API ───

export interface UploadConfig {
  path: string
  maxSize: number
  maxCount: number
  allowedMime: string[]
  allowedExt: string[]
}

export interface STSCredentials {
  accessKeyId: string
  accessKeySecret: string
  securityToken: string
  expiration: string
  region: string
  bucket: string
  uploadPath: string
  uploadConfig: UploadConfig
}

export interface SignedUrlResult {
  url: string
  ossPath: string
  expires: number
  uploadConfig: UploadConfig
}

export type UploadType = 'avatar' | 'product' | 'community' | 'chat'

export function getSTSToken(type: UploadType) {
  return api.post<{ data: STSCredentials }>('/upload/sts-token', { type })
}

export function getSignedUrl(type: UploadType, filename: string) {
  return api.post<{ data: SignedUrlResult }>('/upload/signed-url', { type, filename })
}