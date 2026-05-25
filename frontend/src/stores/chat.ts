import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { useSocket } from '@/composables/useSocket'
import {
  getConversations,
  createConversation,
  getConversation,
  getMessages,
  sendMessage as sendMessageApi,
  markAsRead as markAsReadApi,
  searchMessages,
  getBlacklist,
  blockUser,
  unblockUser,
  checkBlockStatus,
  getQuickReplies,
  createQuickReply,
  updateQuickReply,
  deleteQuickReply,
  batchUpdateSort,
  getBargainTemplate,
  type MessageType,
  type ConversationListItem,
  type ConversationDetail,
  type MessageItem,
  type LastMessage,
  type BlockStatus,
  type QuickReplyItem,
  type BlacklistItem,
} from '@/api/modules/chat'
import { showError, showSuccess } from '@/utils/error'

export const useChatStore = defineStore('chat', () => {
  const socketComposable = useSocket()

  // ─── State ───
  const conversations = ref<ConversationListItem[]>([])
  const conversationsLoading = ref(false)
  const conversationsTotal = ref(0)
  const conversationsPage = ref(1)

  const currentConversation = ref<ConversationDetail | null>(null)
  const currentConversationId = ref<number | null>(null)

  const messagesMap = ref<Map<number, MessageItem[]>>(new Map())
  const messagesLoading = ref(false)
  const messagesHasMore = ref(true)
  const messagesCursor = ref<string | null>(null)

  const onlineStatusMap = ref<Map<number, boolean>>(new Map())
  const typingMap = ref<Map<number, number>>(new Map())
  const blockStatus = ref<BlockStatus | null>(null)

  const quickReplies = ref<QuickReplyItem[]>([])

  const searchResults = ref<MessageItem[]>([])
  const searchKeyword = ref('')
  const searchLoading = ref(false)

  // ─── Computed ───
  const currentMessages = computed(() => {
    if (!currentConversationId.value) return []
    return messagesMap.value.get(currentConversationId.value) || []
  })

  const totalUnreadCount = computed(() => {
    return conversations.value.reduce((sum, c) => sum + c.unreadCount, 0)
  })

  const isCurrentBlocked = computed(() => blockStatus.value?.isBlocked ?? false)
  const isBlockedByMe = computed(() => blockStatus.value?.blockedByMe ?? false)
  const isBlockedByOther = computed(() => blockStatus.value?.blockedByOther ?? false)

  const isOtherTyping = computed(() => {
    if (!currentConversationId.value) return false
    return typingMap.value.has(currentConversationId.value)
  })

  const isOtherOnline = computed(() => {
    if (!currentConversation?.value?.otherUser?.id) return false
    return onlineStatusMap.value.get(currentConversation.value.otherUser.id) ?? false
  })

  function toLastMessage(msg: MessageItem): LastMessage {
    return { id: msg.id, type: msg.type, content: msg.content, createdAt: msg.createdAt, senderId: msg.senderId }
  }

  // ─── Socket Event Handlers ───
  function handleNewMessage(data: unknown) {
    const msg = data as MessageItem
    if (!msg || !msg.conversationId) return
    appendMessage(msg.conversationId, msg)

    const idx = conversations.value.findIndex(c => c.id === msg.conversationId)
    if (idx !== -1) {
      const conv = conversations.value[idx]
      conv.lastMessage = toLastMessage(msg)
      if (msg.conversationId !== currentConversationId.value) {
        conv.unreadCount += 1
      }
      conversations.value = [conv, ...conversations.value.filter(c => c.id !== msg.conversationId)]
    }

    if (msg.conversationId === currentConversationId.value) {
      debounceMarkRead(msg.conversationId)
    }
  }

  function handleMessageRead(data: { conversationId: number; readBy: number; readCount: number }) {
    const msgs = messagesMap.value.get(data.conversationId)
    if (!msgs) return
    const now = new Date().toISOString()
    msgs.forEach(m => {
      if (m.senderId === data.readBy && m.readAt === null) {
        m.readAt = now
      }
    })
  }

  function handleTypingIndicator(data: { conversationId: number; userId: number }) {
    typingMap.value.set(data.conversationId, data.userId)
  }

  function handleStopTypingIndicator(data: { conversationId: number }) {
    typingMap.value.delete(data.conversationId)
  }

  function handleConversationUpdated(data: unknown) {
    const conv = data as ConversationListItem
    if (!conv || !conv.id) return
    const idx = conversations.value.findIndex(c => c.id === conv.id)
    if (idx !== -1) {
      conversations.value[idx] = conv
    } else {
      conversations.value.unshift(conv)
    }
    conversations.value.sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
  }

  function handleOnlineStatus(data: { userId: number; online: boolean }) {
    onlineStatusMap.value.set(data.userId, data.online)
  }

  function handleOnlineStatusBatch(list: Array<{ userId: number; online: boolean }>) {
    for (const item of list) {
      onlineStatusMap.value.set(item.userId, item.online)
    }
  }

  function handleBlocked(data: { blockedByUserId: number }) {
    const otherId = currentConversation.value?.otherUser.id
    if (!otherId) return
    if (data.blockedByUserId === otherId) {
      checkBlock(otherId)
    }
  }

  function handleUnblocked(data: { unblockedByUserId: number }) {
    const otherId = currentConversation.value?.otherUser.id
    if (!otherId) return
    if (data.unblockedByUserId === otherId) {
      checkBlock(otherId)
    }
  }

  function handleSocketError(data: { message: string }) {
    showError(data.message, '聊天错误')
  }

  // ─── Actions: Conversations ───
  async function fetchConversations(page = 1, pageSize = 20) {
    conversationsLoading.value = true
    try {
      const res = await getConversations({ page, pageSize })
      if (res.data.code === 200) {
        const { list, total } = res.data.data
        if (page === 1) {
          conversations.value = list
        } else {
          conversations.value.push(...list)
        }
        conversationsTotal.value = total
        conversationsPage.value = page
      }
    } catch (err) {
      showError(err, '获取会话列表失败')
    } finally {
      conversationsLoading.value = false
    }
  }

  async function openConversation(targetUserId: number): Promise<number | null> {
    try {
      const res = await createConversation(targetUserId)
      if (res.data.code === 200) {
        const conv = res.data.data
        currentConversation.value = conv
        currentConversationId.value = conv.id

        // Join socket room
        socketComposable.joinConversation(conv.id)

        // Load messages
        messagesMap.value.set(conv.id, [])
        messagesCursor.value = null
        messagesHasMore.value = true
        await fetchMessages(conv.id)

        // Check block status
        checkBlock(conv.otherUser.id)

        // Mark as read
        markConversationRead(conv.id)

        // Update or insert in conversation list
        const idx = conversations.value.findIndex(c => c.id === conv.id)
        if (idx !== -1) {
          conversations.value[idx].unreadCount = 0
        }

        return conv.id
      }
    } catch (err) {
      showError(err, '创建会话失败')
    }
    return null
  }

  async function selectConversation(id: number) {
    // Leave previous room
    if (currentConversationId.value && currentConversationId.value !== id) {
      socketComposable.leaveConversation(currentConversationId.value)
    }

    currentConversationId.value = id

    try {
      const res = await getConversation(id)
      if (res.data.code === 200) {
        currentConversation.value = res.data.data
      }
    } catch (err) {
      showError(err, '获取会话详情失败')
    }

    // Join new room
    socketComposable.joinConversation(id)

    // Load messages if not cached
    if (!messagesMap.value.has(id)) {
      messagesMap.value.set(id, [])
      messagesCursor.value = null
      messagesHasMore.value = true
    }
    await fetchMessages(id)

    // Check block status
    if (currentConversation.value?.otherUser?.id) {
      checkBlock(currentConversation.value.otherUser.id)
    }

    // Mark as read
    markConversationRead(id)

    // Update unread in list
    const idx = conversations.value.findIndex(c => c.id === id)
    if (idx !== -1) {
      conversations.value[idx].unreadCount = 0
    }
  }

  function clearCurrentConversation() {
    const oldId = currentConversationId.value
    if (oldId) {
      socketComposable.leaveConversation(oldId)
    }
    currentConversation.value = null
    currentConversationId.value = null
    blockStatus.value = null
    if (oldId) typingMap.value.delete(oldId)
  }

  // ─── Actions: Messages ───
  async function fetchMessages(conversationId: number, before?: string, around?: string): Promise<boolean> {
    messagesLoading.value = true
    try {
      const res = await getMessages(conversationId, {
        page: 1,
        pageSize: 30,
        before: before || undefined,
        around: around || undefined,
      })
      if (res.data.code === 200) {
        const { list } = res.data.data
        const normalized = list.map(normalizeMessage)
        const existing = messagesMap.value.get(conversationId) || []

        if (before) {
          // Prepend older messages
          messagesMap.value.set(conversationId, [...normalized, ...existing])
        } else if (around) {
          // Replace messages when loading around a specific message
          messagesMap.value.set(conversationId, normalized)
        } else {
          messagesMap.value.set(conversationId, normalized)
        }

        // Update cursor (oldest message id)
        if (list.length > 0) {
          messagesCursor.value = list[0].id
        }
        messagesHasMore.value = list.length >= 30

        return list.length > 0
      }
    } catch (err) {
      showError(err, '获取消息失败')
    } finally {
      messagesLoading.value = false
    }
    return false
  }

  async function sendMessage(type: MessageType, content: string) {
    if (!currentConversationId.value) return
    const convId = currentConversationId.value

    try {
      const res = await sendMessageApi(convId, { type, content })
      if (res.data.code === 200) {
        const msg = res.data.data
        appendMessage(convId, msg)

        // Update conversation list lastMessage
        const idx = conversations.value.findIndex(c => c.id === convId)
        if (idx !== -1) {
          conversations.value[idx].lastMessage = toLastMessage(msg)
          conversations.value = [conversations.value[idx], ...conversations.value.filter(c => c.id !== convId)]
        }

        // Stop typing
        socketComposable.emit('chat:stop_typing', { conversationId: convId })
        typingMap.value.delete(convId)
      }
    } catch (err) {
      showError(err, '发送消息失败')
    }
  }

  const messageIds = ref<Set<string>>(new Set())

  // Normalize backend data:
  // - Date objects may arrive as {} (empty object) from BigInt serialization bugs
  // - Date objects may arrive as actual Date instances (class-transformer or similar)
  // - Date strings should pass through as-is
  function normalizeMessage(raw: unknown): MessageItem {
    const msg = raw as MessageItem
    if (msg.readAt && typeof msg.readAt !== 'string') msg.readAt = null

    if (msg.createdAt) {
      const raw = msg.createdAt as unknown
      if (raw instanceof Date) {
        // Actual Date object → convert to ISO string (preserves real timestamp!)
        msg.createdAt = raw.toISOString()
      } else if (typeof raw === 'number') {
        // Unix timestamp: if < 1e12 it's seconds, otherwise milliseconds
        msg.createdAt = new Date(
          raw < 1e12 ? raw * 1000 : raw
        ).toISOString()
      } else if (typeof raw !== 'string') {
        // Unrecognized type (e.g. {} from BigInt serialization bug — now fixed on backend)
        console.warn('[normalizeMessage] unrecognized createdAt type:', typeof msg.createdAt, msg.createdAt, 'msg:', msg.id)
        msg.createdAt = new Date().toISOString()
      }
      // If it's already a valid string, keep as-is
    }
    return msg
  }

  function appendMessage(conversationId: number, msg: MessageItem) {
    const normalized = normalizeMessage(msg)
    if (messageIds.value.has(normalized.id)) return
    messageIds.value.add(normalized.id)
    const list = messagesMap.value.get(conversationId) || []
    list.push(normalized)
    messagesMap.value.set(conversationId, list)
  }

  async function loadMoreMessages(): Promise<boolean> {
    if (!currentConversationId.value || !messagesHasMore.value || messagesLoading.value) return false
    return await fetchMessages(currentConversationId.value, messagesCursor.value ?? undefined)
  }

  async function markConversationRead(conversationId: number) {
    try {
      await markAsReadApi(conversationId)
      socketComposable.emit('chat:mark_read', { conversationId })
    } catch {
      // Silent fail for read receipts
    }
  }

  let markReadTimer: ReturnType<typeof setTimeout> | null = null
  function debounceMarkRead(conversationId: number) {
    if (markReadTimer) clearTimeout(markReadTimer)
    markReadTimer = setTimeout(() => {
      markConversationRead(conversationId)
      markReadTimer = null
    }, 500)
  }

  // ─── Actions: Blacklist ───
  async function checkBlock(userId: number) {
    try {
      const res = await checkBlockStatus(userId)
      if (res.data.code === 200) {
        blockStatus.value = res.data.data
      }
    } catch {
      // Silent
    }
  }

  async function blockOtherUser(userId: number) {
    try {
      const res = await blockUser(userId)
      if (res.data.code === 200) {
        showSuccess('已拉黑该用户')
        checkBlock(userId)
      }
    } catch (err) {
      showError(err, '拉黑失败')
    }
  }

  async function unblockOtherUser(userId: number) {
    try {
      const res = await unblockUser(userId)
      if (res.data.code === 200) {
        showSuccess('已取消拉黑')
        checkBlock(userId)
      }
    } catch (err) {
      showError(err, '取消拉黑失败')
    }
  }

  async function fetchBlacklist(page = 1, pageSize = 20): Promise<BlacklistItem[]> {
    try {
      const res = await getBlacklist({ page, pageSize })
      if (res.data.code === 200) {
        return res.data.data.list
      }
    } catch (err) {
      showError(err, '获取黑名单失败')
    }
    return []
  }

  // ─── Actions: Quick Replies ───
  async function fetchQuickReplies() {
    try {
      const res = await getQuickReplies()
      if (res.data.code === 200) {
        quickReplies.value = res.data.data
      }
    } catch {
      // Silent
    }
  }

  async function addQuickReply(content: string) {
    try {
      const res = await createQuickReply({ content })
      if (res.data.code === 200) {
        quickReplies.value.push(res.data.data)
      }
    } catch (err) {
      showError(err, '添加快捷回复失败')
    }
  }

  async function editQuickReply(id: number, content: string) {
    try {
      const res = await updateQuickReply(id, { content })
      if (res.data.code === 200) {
        const idx = quickReplies.value.findIndex(q => q.id === id)
        if (idx !== -1) quickReplies.value[idx] = res.data.data
      }
    } catch (err) {
      showError(err, '修改快捷回复失败')
    }
  }

  async function removeQuickReply(id: number) {
    try {
      const res = await deleteQuickReply(id)
      if (res.data.code === 200) {
        quickReplies.value = quickReplies.value.filter(q => q.id !== id)
      }
    } catch (err) {
      showError(err, '删除快捷回复失败')
    }
  }

  async function reorderQuickReplies(items: Array<{ id: number; sort: number }>) {
    try {
      const res = await batchUpdateSort(items)
      if (res.data.code === 200) {
        await fetchQuickReplies()
      }
    } catch (err) {
      showError(err, '排序失败')
    }
  }

  // ─── Actions: Bargain ───
  async function fetchBargainTemplate(productId: string) {
    try {
      const res = await getBargainTemplate(productId)
      if (res.data.code === 200) {
        return res.data.data
      }
    } catch {
      // Silent
    }
    return null
  }

  // ─── Actions: Search ───
  async function searchInConversation(conversationId: number, keyword: string) {
    if (!keyword.trim()) {
      clearSearch()
      return
    }
    searchLoading.value = true
    searchKeyword.value = keyword
    try {
      const res = await searchMessages(conversationId, { keyword })
      if (res.data.code === 200) {
        searchResults.value = res.data.data.list
      }
    } catch (err) {
      showError(err, '搜索消息失败')
    } finally {
      searchLoading.value = false
    }
  }

  function clearSearch() {
    searchResults.value = []
    searchKeyword.value = ''
    searchLoading.value = false
  }

  // ─── Typing ───
  let typingTimer: ReturnType<typeof setTimeout> | null = null

  function emitTyping() {
    if (!currentConversationId.value) return
    socketComposable.emit('chat:typing', { conversationId: currentConversationId.value })

    if (typingTimer) clearTimeout(typingTimer)
    typingTimer = setTimeout(() => {
      emitStopTyping()
    }, 3000)
  }

  function emitStopTyping() {
    if (!currentConversationId.value) return
    socketComposable.emit('chat:stop_typing', { conversationId: currentConversationId.value })
    if (typingTimer) {
      clearTimeout(typingTimer)
      typingTimer = null
    }
  }

  // ─── Init & Cleanup ───
  function registerSocketEvents() {
    socketComposable.on('chat:new_message', (data: unknown) => {
      handleNewMessage(data as MessageItem)
    })
    socketComposable.on('chat:message_read', (data: unknown) => {
      handleMessageRead(data as { conversationId: number; readBy: number; readCount: number })
    })
    socketComposable.on('chat:typing_indicator', (data: unknown) => {
      handleTypingIndicator(data as { conversationId: number; userId: number })
    })
    socketComposable.on('chat:stop_typing_indicator', (data: unknown) => {
      handleStopTypingIndicator(data as { conversationId: number })
    })
    socketComposable.on('chat:conversation_updated', (data: unknown) => {
      handleConversationUpdated(data as ConversationListItem)
    })
    socketComposable.on('chat:online_status', (data: unknown) => {
      handleOnlineStatus(data as { userId: number; online: boolean })
    })
    socketComposable.on('chat:online_status_batch', (data: unknown) => {
      handleOnlineStatusBatch(data as Array<{ userId: number; online: boolean }>)
    })
    socketComposable.on('chat:blocked', (data: unknown) => {
      handleBlocked(data as { blockedByUserId: number })
    })
    socketComposable.on('chat:unblocked', (data: unknown) => {
      handleUnblocked(data as { unblockedByUserId: number })
    })
    socketComposable.on('chat:error', (data: unknown) => {
      handleSocketError(data as { message: string })
    })
  }

  function init() {
    socketComposable.connect()
    registerSocketEvents()
    fetchConversations()
    fetchQuickReplies()
  }

  function cleanup() {
    socketComposable.disconnect()
    conversations.value = []
    conversationsLoading.value = false
    conversationsTotal.value = 0
    conversationsPage.value = 1
    currentConversation.value = null
    currentConversationId.value = null
    messagesMap.value.clear()
    messageIds.value.clear()
    messagesLoading.value = false
    messagesHasMore.value = true
    messagesCursor.value = null
    onlineStatusMap.value.clear()
    typingMap.value.clear()
    blockStatus.value = null
    quickReplies.value = []
    searchResults.value = []
    searchKeyword.value = ''
    searchLoading.value = false
    if (typingTimer) {
      clearTimeout(typingTimer)
      typingTimer = null
    }
    if (markReadTimer) {
      clearTimeout(markReadTimer)
      markReadTimer = null
    }
  }

  return {
    // State
    conversations,
    conversationsLoading,
    conversationsTotal,
    conversationsPage,
    currentConversation,
    currentConversationId,
    messagesMap,
    messagesLoading,
    messagesHasMore,
    messagesCursor,
    onlineStatusMap,
    typingMap,
    blockStatus,
    quickReplies,
    searchResults,
    searchKeyword,
    searchLoading,
    // Computed
    currentMessages,
    totalUnreadCount,
    isCurrentBlocked,
    isBlockedByMe,
    isBlockedByOther,
    isOtherTyping,
    isOtherOnline,
    // Actions
    fetchConversations,
    openConversation,
    selectConversation,
    clearCurrentConversation,
    fetchMessages,
    sendMessage,
    appendMessage,
    loadMoreMessages,
    markConversationRead,
    checkBlock,
    blockOtherUser,
    unblockOtherUser,
    fetchBlacklist,
    fetchQuickReplies,
    addQuickReply,
    editQuickReply,
    removeQuickReply,
    reorderQuickReplies,
    fetchBargainTemplate,
    searchInConversation,
    clearSearch,
    emitTyping,
    emitStopTyping,
    init,
    cleanup,
  }
})