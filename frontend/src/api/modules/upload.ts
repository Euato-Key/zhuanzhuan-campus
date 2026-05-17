import api from '../index'
import { getOssUrl } from '@/utils/oss'

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

export interface UploadResult {
  url: string
  ossPath: string
}

export type UploadType = 'avatar' | 'product' | 'community' | 'chat'

export function getSTSToken(type: UploadType) {
  return api.post<{ data: STSCredentials }>('/upload/sts-token', { type })
}

export function getSignedUrl(type: UploadType, filename: string) {
  return api.post<{ data: SignedUrlResult }>('/upload/signed-url', { type, filename })
}

// 简化的上传函数
export async function uploadImage(file: File, type: UploadType = 'product'): Promise<{ data: { code: number; data: UploadResult; message: string } }> {
  const res = await getSignedUrl(type, file.name)
  const { url, ossPath } = res.data.data

  // 上传到OSS
  await fetch(url, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type,
    },
  })

  // 返回完整的 OSS URL
  const fullUrl = getOssUrl(ossPath)
  return {
    data: {
      code: 200,
      data: { url: fullUrl, ossPath },
      message: 'success',
    },
  }
}