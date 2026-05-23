import api from '../index'

export interface UniversityItem {
  id: number
  name: string
  code: string
  province: string
  city: string
  level: string
}

export interface UniversitySearchResult {
  list: UniversityItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export function searchUniversities(params: {
  keyword?: string
  province?: string
  level?: string
  page?: number
  pageSize?: number
}) {
  return api.get<{ code: number; message: string; data: UniversitySearchResult }>('/universities/search', { params })
}

export function getUniversityProvinces() {
  return api.get<{ code: number; message: string; data: string[] }>('/universities/provinces')
}

export function getUniversitiesByProvince(province: string) {
  return api.get<{ code: number; message: string; data: UniversityItem[] }>('/universities/list', {
    params: { province },
  })
}