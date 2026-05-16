import { ElMessageBox } from 'element-plus'

/**
 * 确认对话框组合式函数
 * 封装 ElMessageBox.confirm 的常用模式
 */
export function useConfirmDialog() {
  /**
   * 显示确认对话框
   */
  async function confirm(
    message: string,
    title = '提示',
    options?: {
      type?: 'warning' | 'info' | 'success' | 'error'
      confirmText?: string
      cancelText?: string
    }
  ): Promise<boolean> {
    try {
      await ElMessageBox.confirm(message, title, {
        confirmButtonText: options?.confirmText || '确定',
        cancelButtonText: options?.cancelText || '取消',
        type: options?.type || 'warning'
      })
      return true
    } catch {
      return false
    }
  }

  /**
   * 显示删除确认对话框
   */
  async function confirmDelete(itemName = '该商品'): Promise<boolean> {
    return confirm(`${itemName}吗？删除后无法恢复`, '警告', {
      type: 'warning',
      confirmText: '删除'
    })
  }

  /**
   * 显示下架确认对话框
   */
  async function confirmOffline(): Promise<boolean> {
    return confirm('确定要下架该商品吗？', '提示', { type: 'warning' })
  }

  /**
   * 显示上架确认对话框
   */
  async function confirmRelist(): Promise<boolean> {
    return confirm('确定要重新上架该商品吗？', '提示', { type: 'info' })
  }

  /**
   * 显示封禁确认对话框
   */
  async function confirmBan(itemName = '该用户'): Promise<boolean> {
    return confirm(`确定要封禁${itemName}吗？`, '警告', { type: 'warning' })
  }

  /**
   * 显示解封确认对话框
   */
  async function confirmUnban(itemName = '该商品'): Promise<boolean> {
    return confirm(`确定解封${itemName}吗？`, '提示', { type: 'info' })
  }

  return {
    confirm,
    confirmDelete,
    confirmOffline,
    confirmRelist,
    confirmBan,
    confirmUnban
  }
}
