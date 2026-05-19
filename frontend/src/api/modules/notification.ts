import api from '../index'

// ─── Types ───

export type NotificationType = 'system' | 'product' | 'order' | 'chat' | 'review' | 'interaction'
export type RelatedType = 'order' | 'product' | 'review' | 'user' | 'want_buy'

export interface Notification {
  id: number
  userId: number
  type: NotificationType
  title: string
  content: string | null
  relatedId: string | null
  relatedType: RelatedType | null
  isRead: boolean
  createdAt: string
}

export interface UnreadCountResult {
  total: number
  byType: Partial<Record<NotificationType, number>>
}

export interface NotificationListParams {
  type?: NotificationType
  page?: number
  pageSize?: number
}

export interface PaginatedResponse<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// ─── Constants ───

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  system: '系统',
  product: '商品',
  order: '订单',
  chat: '聊天',
  review: '评价',
  interaction: '互动',
}

export const NOTIFICATION_TYPE_COLORS: Record<NotificationType, string> = {
  system: '#2196F3',
  product: '#4CAF50',
  order: '#FF9800',
  chat: '#9C27B0',
  review: '#F44336',
  interaction: '#FFC107',
}

export const NOTIFICATION_TYPE_ICONS: Record<NotificationType, string> = {
  system: 'Bell',
  product: 'Goods',
  order: 'ShoppingBag',
  chat: 'ChatDotRound',
  review: 'Comment',
  interaction: 'Star',
}

// ─── API Functions ───

export function getNotifications(params?: NotificationListParams) {
  return api.get<{ code: number; data: PaginatedResponse<Notification>; message: string }>(
    '/notifications',
    { params },
  )
}

export function getUnreadCount() {
  return api.get<{ code: number; data: UnreadCountResult; message: string }>(
    '/notifications/unread-count',
  )
}

export function getNotificationDetail(id: number) {
  return api.get<{ code: number; data: Notification; message: string }>(
    `/notifications/${id}`,
  )
}

export function markAsRead(id: number) {
  return api.put<{ code: number; data: Notification; message: string }>(
    `/notifications/${id}/read`,
  )
}

export function markAllAsRead(type?: NotificationType) {
  return api.put<{ code: number; data: { count: number }; message: string }>(
    '/notifications/read-all',
    type ? { type } : {},
  )
}

export function deleteNotification(id: number) {
  return api.delete<{ code: number; data: { message: string }; message: string }>(
    `/notifications/${id}`,
  )
}
