import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  getNotifications,
  getUnreadCount,
  getNotificationDetail,
  markAsRead as markAsReadApi,
  markAllAsRead as markAllAsReadApi,
  deleteNotification as deleteNotificationApi,
} from '@/api/modules/notification'
import type {
  Notification,
  NotificationType,
  UnreadCountResult,
} from '@/api/modules/notification'
import { useSocket } from '@/composables/useSocket'
import { showError, showSuccess } from '@/utils/error'

export const useNotificationStore = defineStore('notification', () => {
  // ─── State ───

  const notifications = ref<Notification[]>([])
  const loading = ref(false)
  const total = ref(0)
  const page = ref(1)
  const pageSize = ref(10)
  const currentType = ref<NotificationType | ''>('')

  const unreadCount = ref<UnreadCountResult>({ total: 0, byType: {} })

  const detailVisible = ref(false)
  const currentNotification = ref<Notification | null>(null)

  const initialized = ref(false)

  // ─── Computed ───

  const hasUnread = computed(() => unreadCount.value.total > 0)

  const unreadByType = computed(() => unreadCount.value.byType)

  const hasMore = computed(() => page.value * pageSize.value < total.value)

  // ─── Socket ───

  const socketComposable = useSocket()

  function registerSocketEvents() {
    socketComposable.on('notification:new', (data: Notification) => {
      notifications.value.unshift(data)
      total.value += 1
      // 服务端会同时推送 unread_count，这里也本地 +1 做即时反馈
      unreadCount.value.total += 1
      if (data.type) {
        const current = unreadCount.value.byType[data.type] ?? 0
        unreadCount.value.byType[data.type] = current + 1
      }
    })

    socketComposable.on('notification:unread_count', (data: UnreadCountResult) => {
      unreadCount.value = data
    })
  }

  // ─── Actions ───

  async function fetchNotifications(reset = false) {
    if (reset) {
      page.value = 1
      notifications.value = []
    }

    loading.value = true
    try {
      const res = await getNotifications({
        type: currentType.value || undefined,
        page: page.value,
        pageSize: pageSize.value,
      })
      const data = res.data.data
      notifications.value = data.list
      total.value = data.total
      page.value = data.page
      pageSize.value = data.pageSize
    } catch {
      showError('获取通知列表失败')
    } finally {
      loading.value = false
    }
  }

  async function fetchMoreNotifications() {
    if (!hasMore.value || loading.value) return
    page.value += 1
    loading.value = true
    try {
      const res = await getNotifications({
        type: currentType.value || undefined,
        page: page.value,
        pageSize: pageSize.value,
      })
      const data = res.data.data
      notifications.value.push(...data.list)
      total.value = data.total
    } catch {
      page.value -= 1
      showError('加载更多通知失败')
    } finally {
      loading.value = false
    }
  }

  async function fetchUnreadCount() {
    try {
      const res = await getUnreadCount()
      unreadCount.value = res.data.data
    } catch {
      // 静默失败，不影响用户体验
    }
  }

  async function viewDetail(id: number) {
    try {
      const res = await getNotificationDetail(id)
      const notification = res.data.data
      currentNotification.value = notification
      detailVisible.value = true

      // 更新列表中对应项的已读状态
      const idx = notifications.value.findIndex(n => n.id === id)
      if (idx !== -1 && !notifications.value[idx].isRead) {
        notifications.value[idx] = { ...notifications.value[idx], isRead: true }
      }
      // 详情查看后服务端会自动标记已读，刷新未读数
      await fetchUnreadCount()
    } catch {
      showError('获取通知详情失败')
    }
  }

  async function markAsRead(id: number) {
    try {
      await markAsReadApi(id)
      const idx = notifications.value.findIndex(n => n.id === id)
      if (idx !== -1) {
        notifications.value[idx] = { ...notifications.value[idx], isRead: true }
      }
      await fetchUnreadCount()
    } catch {
      showError('标记已读失败')
    }
  }

  async function markAllAsRead(type?: NotificationType) {
    try {
      const res = await markAllAsReadApi(type)
      const count = res.data.data.count
      if (count > 0) {
        // 更新列表中匹配项的已读状态
        notifications.value = notifications.value.map(n => {
          if (!n.isRead && (!type || n.type === type)) {
            return { ...n, isRead: true }
          }
          return n
        })
        await fetchUnreadCount()
        showSuccess(`已将 ${count} 条通知标记为已读`)
      }
    } catch {
      showError('批量标记已读失败')
    }
  }

  async function deleteNotification(id: number) {
    try {
      await deleteNotificationApi(id)
      notifications.value = notifications.value.filter(n => n.id !== id)
      total.value -= 1
      showSuccess('通知已删除')
    } catch {
      showError('删除通知失败')
    }
  }

  function setFilterType(type: NotificationType | '') {
    currentType.value = type
    fetchNotifications(true)
  }

  // ─── Lifecycle ───

  function init() {
    if (initialized.value) return
    initialized.value = true
    registerSocketEvents()
    fetchUnreadCount()
  }

  function cleanup() {
    initialized.value = false
    notifications.value = []
    total.value = 0
    page.value = 1
    currentType.value = ''
    unreadCount.value = { total: 0, byType: {} }
    detailVisible.value = false
    currentNotification.value = null
    loading.value = false
  }

  return {
    // state
    notifications,
    loading,
    total,
    page,
    pageSize,
    currentType,
    unreadCount,
    detailVisible,
    currentNotification,
    initialized,
    // computed
    hasUnread,
    unreadByType,
    hasMore,
    // actions
    fetchNotifications,
    fetchMoreNotifications,
    fetchUnreadCount,
    viewDetail,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    setFilterType,
    init,
    cleanup,
  }
})
