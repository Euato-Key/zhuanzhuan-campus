import api from '../index'

// ============================================
// Types
// ============================================

export type ReviewType = 'buyer_to_seller' | 'seller_to_buyer'
export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'deleted'
export type AppendStatus = 'pending' | 'approved' | 'rejected'

// 评价人信息
export interface ReviewUser {
  id: number
  username: string
  avatar: string | null
}

// 评价关联订单信息
export interface ReviewOrder {
  id: string
  orderNo: string
  productName: string
  productImage: string | null
}

// 评价列表项
export interface ReviewItem {
  id: number
  orderId: string
  reviewerId: number
  reviewedId: number
  type: ReviewType
  rating: number
  content: string | null
  images: string[] | null
  isAnonymous: boolean
  status: ReviewStatus
  rejectReason: string | null
  isAppend: boolean
  appendContent: string | null
  appendImages: string[] | null
  appendStatus: AppendStatus | null
  appendAt: string | null
  createdAt: string
  reviewer: ReviewUser | null
  reviewed: ReviewUser | null
  order: ReviewOrder
}

// 商品评价统计摘要
export interface ReviewSummary {
  totalCount: number
  avgRating: number
  ratingDistribution: Record<number, number>
}

// 商品评价列表响应
export interface ProductReviewsResponse {
  list: ReviewItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  summary: ReviewSummary
}

// 订单评价状态
export interface OrderReviewStatus {
  buyerReviewed: boolean
  sellerReviewed: boolean
  canReview: boolean
  canAppend: boolean
  buyerReview: ReviewItem | null
  sellerReview: ReviewItem | null
}

// 分页响应
export interface PaginatedResponse<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// 创建评价请求
export interface CreateReviewRequest {
  orderId: string
  rating: number
  content?: string
  images?: string[]
  isAnonymous?: boolean
}

// 追加评价请求
export interface AppendReviewRequest {
  appendContent: string
  appendImages?: string[]
}

// 商品评价列表查询参数
export interface ProductReviewsParams {
  rating?: number
  hasImage?: boolean
  sortBy?: 'time' | 'rating'
  sortOrder?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

// 我收到的评价查询参数
export interface ReceivedReviewsParams {
  type?: ReviewType
  rating?: number
  page?: number
  pageSize?: number
}

// 我发出的评价查询参数
export interface SentReviewsParams {
  status?: ReviewStatus
  page?: number
  pageSize?: number
}

// 管理员评价列表查询参数
export interface AdminReviewsParams {
  status?: ReviewStatus
  type?: ReviewType
  rating?: number
  page?: number
  pageSize?: number
}

// 管理员拒绝评价请求
export interface RejectReviewRequest {
  rejectReason: string
  rejectAppend?: boolean
}

// ============================================
// Constants
// ============================================

export const REVIEW_TYPE_LABELS: Record<ReviewType, string> = {
  buyer_to_seller: '买家评卖家',
  seller_to_buyer: '卖家评买家',
}

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已拒绝',
  deleted: '已删除',
}

export const REVIEW_STATUS_TAG_TYPE: Record<ReviewStatus, 'warning' | 'success' | 'danger' | 'info'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
  deleted: 'info',
}

// ============================================
// API Functions
// ============================================

// 创建评价
export function createReview(data: CreateReviewRequest) {
  return api.post<{ code: number; data: ReviewItem; message: string }>('/reviews', data)
}

// 追加评价
export function appendReview(id: number, data: AppendReviewRequest) {
  return api.post<{ code: number; data: ReviewItem; message: string }>(`/reviews/${id}/append`, data)
}

// 删除评价
export function deleteReview(id: number) {
  return api.delete<{ code: number; data: { message: string }; message: string }>(`/reviews/${id}`)
}

// 删除追评
export function deleteAppend(id: number) {
  return api.delete<{ code: number; data: { message: string }; message: string }>(`/reviews/${id}/append`)
}

// 获取商品评价列表
export function getProductReviews(productId: string, params?: ProductReviewsParams) {
  return api.get<{ code: number; data: ProductReviewsResponse; message: string }>(`/products/${productId}/reviews`, { params })
}

// 获取我收到的评价
export function getReceivedReviews(params?: ReceivedReviewsParams) {
  return api.get<{ code: number; data: PaginatedResponse<ReviewItem>; message: string }>('/reviews/received', { params })
}

// 获取我发出的评价
export function getSentReviews(params?: SentReviewsParams) {
  return api.get<{ code: number; data: PaginatedResponse<ReviewItem>; message: string }>('/reviews/sent', { params })
}

// 获取订单评价状态
export function getOrderReviewStatus(orderId: string) {
  return api.get<{ code: number; data: OrderReviewStatus; message: string }>(`/orders/${orderId}/review-status`)
}

// 管理员获取评价审核列表
export function getAdminReviews(params?: AdminReviewsParams) {
  return api.get<{ code: number; data: PaginatedResponse<ReviewItem>; message: string }>('/reviews/admin/list', { params })
}

// 管理员审核通过
export function adminApproveReview(id: number) {
  return api.put<{ code: number; data: ReviewItem; message: string }>(`/reviews/admin/${id}/approve`)
}

// 管理员审核拒绝
export function adminRejectReview(id: number, data: RejectReviewRequest) {
  return api.put<{ code: number; data: { message: string }; message: string }>(`/reviews/admin/${id}/reject`, data)
}