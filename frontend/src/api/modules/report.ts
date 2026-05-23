import api from '../index'
import type { PaginatedResponse } from '../types'

// ============================================================
// Types
// ============================================================

export type ReportTargetType = 'product' | 'want_buy' | 'user' | 'comment' | 'review'
export type ReportReason = 'fake' | 'fraud' | 'harassment' | 'spam' | 'inappropriate' | 'other'
export type ReportStatus = 'pending' | 'processing' | 'resolved' | 'dismissed'
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
  fake: '虚假信息',
  fraud: '欺诈行为',
  harassment: '骚扰/辱骂',
  spam: '垃圾广告',
  inappropriate: '不当内容',
  other: '其他',
}

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  pending: '待处理',
  processing: '处理中',
  resolved: '已处理',
  dismissed: '已驳回',
}

export const REPORT_STATUS_TAG_TYPE: Record<ReportStatus, string> = {
  pending: 'warning',
  processing: 'primary',
  resolved: 'success',
  dismissed: 'info',
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
  return api.get<{ code: number; message: string; data: PaginatedResponse<ReportItem> }>('/admin/reports', { params })
}

export function getAdminReportDetail(id: number) {
  return api.get<{ code: number; message: string; data: ReportItem }>(`/admin/reports/${id}`)
}

export function handleReport(id: number, data: AdminHandleData) {
  return api.put<{ code: number; message: string; data: ReportItem }>(`/admin/reports/${id}/handle`, data)
}
