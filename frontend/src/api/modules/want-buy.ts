import api from '../index'
import { getCategoryTree } from './category'

// 导出分类API供组件使用
export { getCategoryTree }
export type { Category } from './category'

// 求购贴状态枚举
export type WantBuyStatus = 'active' | 'found' | 'closed' | 'expired'

// 求购贴列表项
export interface WantBuyListItem {
  id: number
  userId: number
  name: string
  categoryId: number | null
  description: string | null
  tags: string[] | null
  budgetMin: number | null
  budgetMax: number | null
  quantity: number
  images: string[] | null
  status: WantBuyStatus
  validDays: number
  expireTime: string | null
  viewCount: number
  commentCount: number
  createdAt: string
  user: {
    id: number
    username: string
    avatar: string | null
    school: string | null
    campus: string | null
  }
  category: {
    id: number
    name: string
  } | null
}

// 求购贴详情
export interface WantBuyDetail extends WantBuyListItem {
  updatedAt: string
  isOwner: boolean
}

// 求购贴评论
export interface WantBuyComment {
  id: number
  wantBuyId: number
  userId: number
  parentId: number | null
  replyToId: number | null
  content: string
  likeCount: number
  createdAt: string
  updatedAt: string
  user: {
    id: number
    username: string
    avatar: string | null
  }
  replyTo?: {
    id: number
    userId: number
    user: {
      id: number
      username: string
      avatar: string | null
    }
  }
  isLiked: boolean
  replies: WantBuyComment[]
}

// 分页响应
export interface PaginatedResponse<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// 求购贴查询参数
export interface WantBuyQueryParams {
  page?: number
  pageSize?: number
  keyword?: string
  categoryId?: number
  status?: WantBuyStatus
  sortBy?: 'time' | 'view' | 'comment'
  sortOrder?: 'asc' | 'desc'
}

// 创建求购贴数据
export interface CreateWantBuyData {
  name: string
  categoryId?: number
  description?: string
  tags?: string[]
  budgetMin?: number
  budgetMax?: number
  quantity?: number
  images?: string[]
  validDays?: 7 | 15 | 30
}

// 更新求购贴数据
export interface UpdateWantBuyData extends Partial<CreateWantBuyData> {}

// 创建评论数据
export interface CreateCommentData {
  content: string
  parentId?: number
  replyToId?: number // 回复的目标评论ID（用于显示"回复@xxx"）
}

// 状态显示文本
export const WANT_BUY_STATUS_LABELS: Record<WantBuyStatus, string> = {
  active: '求购中',
  found: '已找到',
  closed: '已关闭',
  expired: '已过期',
}

// 状态对应的标签类型（用于 el-tag）
export const WANT_BUY_STATUS_TAG_TYPE: Record<WantBuyStatus, 'success' | 'warning' | 'danger' | 'info'> = {
  active: 'success',
  found: 'primary',
  closed: 'info',
  expired: 'warning',
}

// 有效期选项
export const VALID_DAYS_OPTIONS = [
  { label: '7天', value: 7 },
  { label: '15天', value: 15 },
  { label: '30天', value: 30 },
] as const

// ========== 公开接口 ==========

// 获取求购贴列表
export function getWantBuyList(params?: WantBuyQueryParams) {
  return api.get<{ code: number; data: PaginatedResponse<WantBuyListItem>; message: string }>(
    '/want-buys',
    { params }
  )
}

// 获取求购贴详情
export function getWantBuyById(id: number) {
  return api.get<{ code: number; data: WantBuyDetail; message: string }>(`/want-buys/${id}`)
}

// 获取用户发布的求购贴列表
export function getUserWantBuyList(userId: number, params?: { page?: number; pageSize?: number }) {
  return api.get<{ code: number; data: PaginatedResponse<WantBuyListItem>; message: string }>(
    `/want-buys/user/${userId}`,
    { params }
  )
}

// ========== 用户接口 ==========

// 创建求购贴
export function createWantBuy(data: CreateWantBuyData) {
  return api.post<{ code: number; data: WantBuyDetail; message: string }>('/want-buys', data)
}

// 获取我的求购贴列表
export function getMyWantBuyList(params?: { page?: number; pageSize?: number; status?: WantBuyStatus; keyword?: string }) {
  return api.get<{ code: number; data: PaginatedResponse<WantBuyListItem>; message: string }>(
    '/want-buys/my/list',
    { params }
  )
}

// 更新求购贴
export function updateWantBuy(id: number, data: UpdateWantBuyData) {
  return api.put<{ code: number; data: WantBuyDetail; message: string }>(`/want-buys/${id}`, data)
}

// 删除求购贴
export function deleteWantBuy(id: number) {
  return api.delete<{ code: number; data: null; message: string }>(`/want-buys/${id}`)
}

// 标记为已找到
export function markWantBuyFound(id: number) {
  return api.put<{ code: number; data: WantBuyDetail; message: string }>(`/want-buys/${id}/found`)
}

// 关闭求购贴
export function closeWantBuy(id: number) {
  return api.put<{ code: number; data: WantBuyDetail; message: string }>(`/want-buys/${id}/close`)
}

// 重新开启求购贴
export function reopenWantBuy(id: number) {
  return api.put<{ code: number; data: WantBuyDetail; message: string }>(`/want-buys/${id}/reopen`)
}

// ========== 评论接口 ==========

// 获取评论列表
export function getWantBuyComments(wantBuyId: number, params?: { page?: number; pageSize?: number }) {
  return api.get<{ code: number; data: PaginatedResponse<WantBuyComment>; message: string }>(
    `/want-buys/${wantBuyId}/comments`,
    { params }
  )
}

// 发表评论
export function createWantBuyComment(wantBuyId: number, data: CreateCommentData) {
  return api.post<{ code: number; data: WantBuyComment; message: string }>(
    `/want-buys/${wantBuyId}/comments`,
    data
  )
}

// 修改评论
export function updateWantBuyComment(commentId: number, content: string) {
  return api.put<{ code: number; data: WantBuyComment; message: string }>(
    `/want-buys/comments/${commentId}`,
    { content }
  )
}

// 删除评论
export function deleteWantBuyComment(commentId: number) {
  return api.delete<{ code: number; data: null; message: string }>(`/want-buys/comments/${commentId}`)
}

// 点赞评论
export function likeWantBuyComment(commentId: number) {
  return api.post<{ code: number; data: { likeCount: number }; message: string }>(
    `/want-buys/comments/${commentId}/like`
  )
}

// 取消点赞
export function unlikeWantBuyComment(commentId: number) {
  return api.delete<{ code: number; data: { likeCount: number }; message: string }>(
    `/want-buys/comments/${commentId}/like`
  )
}

// ========== 管理员接口 ==========

// 获取求购贴列表（管理员）
export function getAdminWantBuyList(params?: WantBuyQueryParams & { userId?: number }) {
  return api.get<{ code: number; data: PaginatedResponse<WantBuyListItem>; message: string }>(
    '/want-buys/admin/list',
    { params }
  )
}

// 删除求购贴（管理员）
export function adminDeleteWantBuy(id: number) {
  return api.delete<{ code: number; data: null; message: string }>(`/want-buys/admin/${id}`)
}

// 删除评论（管理员）
export function adminDeleteWantBuyComment(commentId: number) {
  return api.delete<{ code: number; data: null; message: string }>(`/want-buys/admin/comments/${commentId}`)
}
