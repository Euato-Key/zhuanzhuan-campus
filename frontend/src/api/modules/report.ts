import api from '../index'
import type { PaginatedResponse } from '../types'

// ============================================================
// Types
// ============================================================

export type ReportTargetType = 'product' | 'want_buy' | 'user' | 'comment' | 'review'
export type ReportReason = 'fraud' | 'prohibited' | 'inappropriate' | 'spam' | 'other'
export type ReportStatus = 'pending' | 'dismissed' | 'warning' | 'banned' | 'resolved'
export type HandleStatus = 'dismissed' | 'warning' | 'banned' | 'resolved'

// ============================================================
// Maps
// ============================================================

export const REPORT_TARGET_TYPE_LABELS: Record<ReportTargetType, string> = {
  product: '商品',
  want_buy: '求购',
  user: '用户',
  comment: '评论',
  review: '评价',
}

export const REPORT_TARGET_TAG_TYPE: Record<ReportTargetType, string> = {
  product: 'primary',
  want_buy: 'success',
  user: 'warning',
  comment: 'info',
  review: 'danger',
}

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  fraud: '欺诈行为',
  prohibited: '违禁品',
  inappropriate: '不当内容',
  spam: '垃圾广告',
  other: '其他',
}

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  pending: '待处理',
  dismissed: '已驳回',
  warning: '已警告',
  banned: '已封禁',
  resolved: '已解决',
}

export const REPORT_STATUS_TAG_TYPE: Record<ReportStatus, string> = {
  pending: 'warning',
  dismissed: 'info',
  warning: 'primary',
  banned: 'danger',
  resolved: 'success',
}

// ============================================================
// Interfaces
// ============================================================

export interface ReportItem {
  id: number
  reporterId: number
  targetType: ReportTargetType
  targetId: string | number
  reason: ReportReason
  detail: string | null
  images: string[] | null
  status: ReportStatus
  handlerId: number | null
  handlerNote: string | null
  handledAt: string | null
  createdAt: string
  updatedAt: string
  reporter?: {
    id: number
    username: string
    avatar: string | null
  }
  handler?: {
    id: number
    username: string
  }
}

export interface CreateReportData {
  targetType: ReportTargetType
  targetId: string | number
  reason: ReportReason
  detail?: string
  images?: string[]
}

export interface AdminHandleData {
  status: HandleStatus
  handlerNote?: string
}

// ============================================================
// API Functions
// ============================================================

export function createReport(data: CreateReportData) {
  return api.post<{ code: number; message: string; data: ReportItem }>('/reports', data)
}

export function getMyReports(params?: { page?: number; pageSize?: number }) {
  return api.get<{ code: number; message: string; data: PaginatedResponse<ReportItem> }>('/reports/my', { params })
}

export function getAdminReportList(params?: {
  page?: number
  pageSize?: number
  targetType?: ReportTargetType
  status?: ReportStatus
  keyword?: string
}) {
  return api.get<{ code: number; message: string; data: PaginatedResponse<ReportItem> }>('/reports/admin/list', { params })
}

export function getAdminReportDetail(id: number) {
  return api.get<{ code: number; message: string; data: ReportItem }>(`/reports/admin/${id}`)
}

export function handleReport(id: number, data: AdminHandleData) {
  return api.put<{ code: number; message: string; data: ReportItem }>(`/reports/admin/${id}/handle`, data)
}
