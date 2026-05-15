import api from './index'

export interface Category {
  id: number
  name: string
  parentId: number | null
  icon: string | null
  sort: number
  children?: Category[]
  createdAt?: string
  updatedAt?: string
}

export interface CategoryDetail extends Category {
  _count?: {
    products: number
  }
}

export function getCategoryTree() {
  return api.get<{ code: number; data: Category[]; message: string }>('/categories/tree')
}

export function getCategoryList() {
  return api.get<{ code: number; data: Category[]; message: string }>('/categories/list')
}

export function getCategoryById(id: number) {
  return api.get<{ code: number; data: CategoryDetail; message: string }>(`/categories/${id}`)
}

export interface CreateCategoryData {
  name: string
  parentId?: number | null
  icon?: string
  sort?: number
}

export function createCategory(data: CreateCategoryData) {
  return api.post<{ code: number; data: Category; message: string }>('/categories', data)
}

export interface UpdateCategoryData {
  name?: string
  parentId?: number | null
  icon?: string
  sort?: number
}

export function updateCategory(id: number, data: UpdateCategoryData) {
  return api.put<{ code: number; data: Category; message: string }>(`/categories/${id}`, data)
}

export function deleteCategory(id: number) {
  return api.delete<{ code: number; data: null; message: string }>(`/categories/${id}`)
}
