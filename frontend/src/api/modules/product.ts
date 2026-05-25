import api from '../index'
import { getCategoryTree } from './category'
import type { PaginatedResponse } from '../types'

// 导出分类API供组件使用
export { getCategoryTree }
export type { Category } from './category'

// 商品状态枚举
export type ProductStatus = 'pending' | 'active' | 'offline' | 'banned' | 'audit_failed' | 'expired'
export type ItemCondition = 'new' | '99new' | '95new' | '90new' | '80new'
export type DeliveryType = 'self' | 'express' | 'both'

// 商品规格
export interface ProductSpec {
  name: string
  value: string
}

// 商品列表项
export interface ProductListItem {
  id: string
  name: string
  images: string[]
  currentPrice: number
  originalPrice: number | null
  itemCondition: ItemCondition
  deliveryType: DeliveryType
  bargain: boolean
  viewCount: number
  favoriteCount: number
  createdAt: string
  category: {
    id: number
    name: string
  }
  user: {
    id: number
    username: string
    avatar: string | null
    school: string | null
  }
}

// 用户主页商品项（简化版，仅展示在售商品）
export interface UserProductItem {
  id: string
  name: string
  images: string[]
  currentPrice: number
  status: 'active'
}

// 商品详情
export interface ProductDetail extends ProductListItem {
  description: string | null
  categoryId: number
  tags: string[] | null
  detailImages: string[] | null
  pickupAddress: string | null
  pickupTime: string | null
  stock: number
  brand: string | null
  specs: ProductSpec[] | null
  shippingAddress: string | null
  validDays: number | null
  expireTime: string | null
  status: ProductStatus
  rejectReason: string | null
  auditCount: number
  relistCount: number
  updatedAt: string
  isFavorited: boolean
  category: {
    id: number
    name: string
    parentId: number | null
  }
  user: {
    id: number
    username: string
    avatar: string | null
    school: string | null
    campus: string | null
    creditScore: number
  }
}

// 我的商品项（独立定义，不继承 ProductListItem）
export interface MyProductItem {
  id: string
  name: string
  images: string[]
  currentPrice: number
  originalPrice: number | null
  itemCondition: ItemCondition
  deliveryType: DeliveryType
  bargain: boolean
  viewCount: number
  favoriteCount: number
  createdAt: string
  status: ProductStatus
  stock: number
  rejectReason: string | null
  auditCount: number
  expireTime: string | null
  detailImages: string[] | null
  tags: string[] | null
  specs: ProductSpec[] | null
  pickupAddress: string | null
  pickupTime: string | null
  brand: string | null
  description: string | null
  category?: {
    id: number
    name: string
  }
  user?: {
    id: number
    username: string
    avatar?: string | null
    email?: string
    school?: string | null
    campus?: string | null
    creditScore?: number
  }
}

// 管理员商品项（包含卖家邮箱）
export interface AdminProductItem extends MyProductItem {
  user: {
    id: number
    username: string
    avatar?: string | null
    email: string  // 管理员视图包含卖家邮箱
    school?: string | null
    campus?: string | null
    creditScore?: number
  }
}

// 创建商品数据
export interface CreateProductData {
  name: string
  description?: string
  categoryId: number
  tags?: string[]
  images: string[]
  detailImages?: string[]
  originalPrice?: number
  currentPrice: number
  bargain?: boolean
  deliveryType: DeliveryType
  pickupAddress?: string
  pickupTime?: string
  itemCondition: ItemCondition
  stock?: number
  brand?: string
  specs?: ProductSpec[]
  shippingAddress?: string
  validDays?: number
}

// 更新商品数据
export interface UpdateProductData extends Partial<CreateProductData> {}

// 商品查询参数
export interface ProductQueryParams {
  page?: number
  pageSize?: number
  keyword?: string
  categoryId?: number
  itemCondition?: ItemCondition
  minPrice?: number
  maxPrice?: number
  deliveryType?: DeliveryType
  sortBy?: 'price' | 'time' | 'favorite'
  sortOrder?: 'asc' | 'desc'
  school?: string
}

// 我的商品查询参数
export interface MyProductQueryParams {
  page?: number
  pageSize?: number
  status?: ProductStatus
}

// 管理员商品查询参数
export interface AdminProductQueryParams extends ProductQueryParams {
  sellerId?: number
}

// 新旧程度显示文本
export const ITEM_CONDITION_LABELS: Record<ItemCondition, string> = {
  new: '全新',
  '99new': '99新',
  '95new': '95新',
  '90new': '9成新',
  '80new': '8成新及以下',
}

// 后端返回的 Prisma 枚举值映射到前端格式
export const ITEM_CONDITION_MAP: Record<string, ItemCondition> = {
  new: 'new',
  ninety_nine_new: '99new',
  ninety_five_new: '95new',
  ninety_new: '90new',
  eighty_new: '80new',
}

// 获取新旧程度显示文本
export function getItemConditionLabel(value: string): string {
  const mapped = ITEM_CONDITION_MAP[value] || value
  return ITEM_CONDITION_LABELS[mapped] || value
}

// 商品状态显示文本
export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  pending: '待审核',
  active: '在售',
  offline: '已下架',
  banned: '已封禁',
  audit_failed: '审核失败',
  expired: '已过期',
}

// 商品状态对应的标签类型（用于 el-tag）
export const PRODUCT_STATUS_TAG_TYPE: Record<ProductStatus, 'success' | 'warning' | 'danger' | 'info'> = {
  active: 'success',
  pending: 'warning',
  banned: 'danger',
  offline: 'info',
  audit_failed: 'danger',
  expired: 'info',
}

// 交易方式显示文本
export const DELIVERY_TYPE_LABELS: Record<DeliveryType, string> = {
  self: '自提',
  express: '快递',
  both: '自提/快递',
}

// ========== 公开接口 ==========

// 获取商品列表
export function getProductList(params: ProductQueryParams) {
  return api.get<{ code: number; data: PaginatedResponse<ProductListItem>; message: string }>(
    '/products',
    { params }
  )
}

// 获取商品详情
export function getProductById(id: string) {
  return api.get<{ code: number; data: ProductDetail; message: string }>(`/products/${id}`)
}

// 获取用户发布的商品列表（公开接口）
export function getUserProducts(userId: number, params?: { page?: number; pageSize?: number }) {
  return api.get<{ code: number; data: PaginatedResponse<UserProductItem>; message: string }>(
    `/products/user/${userId}`,
    { params }
  )
}

// ========== 用户接口 ==========

// 创建商品
export function createProduct(data: CreateProductData) {
  return api.post<{ code: number; data: ProductDetail; message: string }>('/products', data)
}

// 获取我的商品列表
export function getMyProducts(params: MyProductQueryParams) {
  return api.get<{ code: number; data: PaginatedResponse<MyProductItem>; message: string }>(
    '/products/my/list',
    { params }
  )
}

// 更新商品
export function updateProduct(id: string, data: UpdateProductData) {
  return api.put<{ code: number; data: ProductDetail; message: string }>(`/products/${id}`, data)
}

// 下架商品
export function offlineProduct(id: string) {
  return api.put<{ code: number; data: ProductDetail; message: string }>(`/products/${id}/offline`)
}

// 重新上架
export function relistProduct(id: string) {
  return api.put<{ code: number; data: ProductDetail; message: string }>(`/products/${id}/relist`)
}

// 删除商品
export function deleteProduct(id: string) {
  return api.delete<{ code: number; data: null; message: string }>(`/products/${id}`)
}

// ========== 管理员接口 ==========

// 获取所有商品列表（管理员）
export function getAdminProductList(params: AdminProductQueryParams) {
  return api.get<{ code: number; data: PaginatedResponse<AdminProductItem>; message: string }>(
    '/products/admin/list',
    { params }
  )
}

// 审核通过
export function approveProduct(id: string) {
  return api.put<{ code: number; data: ProductDetail; message: string }>(
    `/products/admin/${id}/approve`
  )
}

// 审核拒绝
export function rejectProduct(id: string, reason: string) {
  return api.put<{ code: number; data: ProductDetail; message: string }>(
    `/products/admin/${id}/reject`,
    { reason }
  )
}

// 封禁商品
export function banProduct(id: string, reason: string) {
  return api.put<{ code: number; data: ProductDetail; message: string }>(
    `/products/admin/${id}/ban`,
    { reason }
  )
}

// 解封商品
export function unbanProduct(id: string) {
  return api.put<{ code: number; data: ProductDetail; message: string }>(
    `/products/admin/${id}/unban`
  )
}

// 强制下架
export function forceOfflineProduct(id: string, reason: string) {
  return api.put<{ code: number; data: ProductDetail; message: string }>(
    `/products/admin/${id}/force-offline`,
    { reason }
  )
}

// 收藏商品
export function addFavorite(id: string) {
  return api.post<{ code: number; data: { isFavorited: boolean }; message: string }>(
    `/products/${id}/favorite`
  )
}

// 取消收藏
export function removeFavorite(id: string) {
  return api.delete<{ code: number; data: { isFavorited: boolean }; message: string }>(
    `/products/${id}/favorite`
  )
}

// 收藏列表项
export interface FavoriteItem {
  id: string
  name: string
  images: string[]
  currentPrice: number
  originalPrice: number | null
  itemCondition: ItemCondition
  deliveryType: DeliveryType
  bargain: boolean
  viewCount: number
  favoriteCount: number
  status: ProductStatus
  createdAt: string
  favoriteId: number
  favoritedAt: string
  category: {
    id: number
    name: string
  }
  user: {
    id: number
    username: string
    avatar: string | null
    school: string | null
  }
}

// 获取我的收藏列表
export function getMyFavorites(params?: { page?: number; pageSize?: number }) {
  return api.get<{ code: number; data: PaginatedResponse<FavoriteItem>; message: string }>(
    '/products/my/favorites',
    { params }
  )
}