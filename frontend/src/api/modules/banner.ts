import api from '../index'
import type { PaginatedResponse } from '../types'

export type BannerStatus = 'active' | 'inactive'

export interface BannerItem {
  id: number
  title: string
  imageUrl: string
  linkUrl: string | null
  sort: number
  status: BannerStatus
  startTime: string | null
  endTime: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateBannerData {
  title: string
  imageUrl: string
  linkUrl?: string
  sort?: number
  status?: BannerStatus
  startTime?: string
  endTime?: string
}

export interface UpdateBannerData extends Partial<CreateBannerData> {}

export const BANNER_STATUS_LABELS: Record<BannerStatus, string> = {
  active: '启用',
  inactive: '禁用',
}

export const BANNER_STATUS_TAG_TYPE: Record<BannerStatus, 'success' | 'info'> = {
  active: 'success',
  inactive: 'info',
}

// ========== 公开接口 ==========

export function getActiveBanners() {
  return api.get<{ code: number; data: BannerItem[]; message: string }>('/banners')
}

// ========== 管理员接口 ==========

export function getBannerList(params?: { page?: number; pageSize?: number; status?: BannerStatus }) {
  return api.get<{ code: number; data: PaginatedResponse<BannerItem>; message: string }>(
    '/admin/banners',
    { params }
  )
}

export function createBanner(data: CreateBannerData) {
  return api.post<{ code: number; data: BannerItem; message: string }>('/admin/banners', data)
}

export function updateBanner(id: number, data: UpdateBannerData) {
  return api.put<{ code: number; data: BannerItem; message: string }>(`/admin/banners/${id}`, data)
}

export function deleteBanner(id: number) {
  return api.delete<{ code: number; data: null; message: string }>(`/admin/banners/${id}`)
}

export function toggleBannerStatus(id: number) {
  return api.put<{ code: number; data: BannerItem; message: string }>(`/admin/banners/${id}/status`)
}
