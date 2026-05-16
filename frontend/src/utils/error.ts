import { ElMessage } from 'element-plus'
import type { AxiosError } from 'axios'

/**
 * API 错误响应结构
 */
interface ApiErrorResponse {
  code: number
  message: string
  data: null | unknown
}

/**
 * 从错误对象中提取错误消息
 */
export function getErrorMessage(error: unknown, fallback = '操作失败，请稍后重试'): string {
  if (!error) {
    return fallback
  }

  // Axios 错误
  const axiosError = error as AxiosError<ApiErrorResponse>
  if (axiosError.response?.data?.message) {
    return axiosError.response.data.message
  }

  // 网络错误
  if (axiosError.code === 'NETWORK_ERROR' || axiosError.message?.includes('Network Error')) {
    return '网络连接失败，请检查网络'
  }

  // 超时错误
  if (axiosError.code === 'ECONNABORTED' || axiosError.message?.includes('timeout')) {
    return '请求超时，请稍后重试'
  }

  // 普通错误对象
  if (error instanceof Error) {
    return error.message || fallback
  }

  // 字符串错误
  if (typeof error === 'string') {
    return error
  }

  return fallback
}

/**
 * 显示错误提示
 */
export function showError(error: unknown, fallback?: string): void {
  const message = getErrorMessage(error, fallback)
  ElMessage.error(message)
}

/**
 * 显示成功提示
 */
export function showSuccess(message: string): void {
  ElMessage.success(message)
}

/**
 * 显示警告提示
 */
export function showWarning(message: string): void {
  ElMessage.warning(message)
}

/**
 * 显示信息提示
 */
export function showInfo(message: string): void {
  ElMessage.info(message)
}
