import api from '../index'

export interface Address {
  id: number
  userId: number
  receiverName: string
  receiverPhone: string
  province: string
  city: string
  district: string
  street: string | null
  detail: string
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateAddressData {
  receiverName: string
  receiverPhone: string
  province: string
  city: string
  district: string
  street?: string
  detail: string
  isDefault?: boolean
}

export interface UpdateAddressData {
  receiverName?: string
  receiverPhone?: string
  province?: string
  city?: string
  district?: string
  street?: string
  detail?: string
  isDefault?: boolean
}

// 获取地址列表
export function getAddresses() {
  return api.get<{ code: number; data: Address[]; message: string }>('/addresses')
}

// 获取地址详情
export function getAddress(id: number) {
  return api.get<{ code: number; data: Address; message: string }>(`/addresses/${id}`)
}

// 创建地址
export function createAddress(data: CreateAddressData) {
  return api.post<{ code: number; data: Address; message: string }>('/addresses', data)
}

// 更新地址
export function updateAddress(id: number, data: UpdateAddressData) {
  return api.put<{ code: number; data: Address; message: string }>(`/addresses/${id}`, data)
}

// 删除地址
export function deleteAddress(id: number) {
  return api.delete<{ code: number; message: string }>(`/addresses/${id}`)
}

// 设为默认地址
export function setDefaultAddress(id: number) {
  return api.put<{ code: number; data: Address; message: string }>(`/addresses/${id}/default`)
}
