/**
 * OSS 工具函数
 */

// OSS Bucket 基础 URL
const OSS_BASE_URL = 'https://zhuanzhuan-campus.oss-cn-beijing.aliyuncs.com/'

/**
 * 将相对路径转换为完整的 OSS URL
 * @param path - 相对路径，如 "avatars/3/2026/05/15/xxx.jpg"
 * @returns 完整 URL，如 "https://zhuanzhuan-campus.oss-cn-beijing.aliyuncs.com/avatars/3/2026/05/15/xxx.jpg"
 */
export function getOssUrl(path: string | null | undefined): string {
  if (!path) return ''
  // 如果已经是完整 URL，直接返回
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }
  return OSS_BASE_URL + path
}

/**
 * 获取 OSS 基础 URL（用于其他用途）
 */
export function getOssBaseUrl(): string {
  return OSS_BASE_URL
}
