import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { ElMessage } from 'element-plus'
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
  type BlockStatus,
  type QuickReplyItem,
  type BlacklistItem,
} from '@/api/modules/chat'
import { showError } from '@/utils/error'

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

  // ─── Socket Event Handlers ───
  function handleNewMessage(data: { message: MessageItem }) {
    const msg = data.message
    appendMessage(msg.conversationId, msg)

    // Update conversation list
    const idx = conversations.value.findIndex(c => c.id === msg.conversationId)
    if (idx !== -1) {
      const conv = conversations.value[idx]
      conv.lastMessage = {
        id: msg.id,
        type: msg.type,
        content: msg.content,
        createdAt: msg.createdAt,
        senderId: msg.senderId,
      }
      // Increment unread if not current conversation
      if (msg.conversationId !== currentConversationId.value) {
        conv.unreadCount += 1
      }
      // Move to top
      conversations.value.splice(idx, 1)
      conversations.value.unshift(conv)
    }

    // Auto mark as read if in current conversation
    if (msg.conversationId === currentConversationId.value) {
      setTimeout(() => markConversationRead(msg.conversationId), 500)
    }
  }

  function handleMessageRead(data: { conversationId: number; userId: number }) {
    const msgs = messagesMap.value.get(data.conversationId)
    if (!msgs) return
    // Mark own messages as read
    msgs.forEach(m => {
      if (m.conversationId === data.conversationId && m.readAt === null) {
        m.readAt = new Date().toISOString()
      }
    })
  }

  function handleTypingIndicator(data: { conversationId: number; userId: number }) {
    typingMap.value.set(data.conversationId, data.userId)
  }

  function handleStopTypingIndicator(data: { conversationId: number }) {
    typingMap.value.delete(data.conversationId)
  }

  function handleConversationUpdated(data: { conversation: ConversationListItem }) {
    const idx = conversations.value.findIndex(c => c.id === data.conversation.id)
    if (idx !== -1) {
      conversations.value[idx] = data.conversation
    } else {
      conversations.value.unshift(data.conversation)
    }
    conversations.value.sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
  }

  function handleOnlineStatus(data: { userId: number; online: boolean }) {
    onlineStatusMap.value.set(data.userId, data.online)
  }

  function handleBlocked(data: { blockedBy: number; blockedUser: number }) {
    if (!currentConversation.value) return
    if (data.blockedUser === currentConversation.value.otherUser.id || data.blockedBy === currentConversation.value.otherUser.id) {
      checkBlock(currentConversation.value.otherUser.id)
    }
  }

  function handleUnblocked(data: { unblockedBy: number; unblockedUser: number }) {
    if (!currentConversation.value) return
    if (data.unblockedUser === currentConversation.value.otherUser.id || data.unblockedBy === currentConversation.value.otherUser.id) {
      checkBlock(currentConversation.value.otherUser.id)
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
    if (currentConversationId.value) {
      socketComposable.leaveConversation(currentConversationId.value)
    }
    currentConversation.value = null
    currentConversationId.value = null
    blockStatus.value = null
    typingMap.value.delete(currentConversationId.value ?? 0)
  }

  // ─── Actions: Messages ───
  async function fetchMessages(conversationId: number, before?: string) {
    messagesLoading.value = true
    try {
      const res = await getMessages(conversationId, {
        page: 1,
        pageSize: 30,
        before: before || undefined,
      })
      if (res.data.code === 200) {
        const { list } = res.data.data
        const existing = messagesMap.value.get(conversationId) || []

        if (before) {
          // Prepend older messages
          messagesMap.value.set(conversationId, [...list, ...existing])
        } else {
          messagesMap.value.set(conversationId, list)
        }

        // Update cursor (oldest message id)
        if (list.length > 0) {
          messagesCursor.value = list[0].id
        }
        messagesHasMore.value = list.length >= 30
      }
    } catch (err) {
      showError(err, '获取消息失败')
    } finally {
      messagesLoading.value = false
    }
  }

  async function sendMessage(type: MessageType, content: string) {
    if (!currentConversationId.value) return
    const convId = currentConversationId.value

    try {
      const res = await sendMessageApi(convId, { type, content })
      if (res.data.code === 200) {
        const msg = res.data.data
        appendMessage(convId, msg)

        // Notify via socket
        socketComposable.emit('chat:send_message', {
          conversationId: convId,
          message: msg,
        })

        // Update conversation list lastMessage
        const idx = conversations.value.findIndex(c => c.id === convId)
        if (idx !== -1) {
          conversations.value[idx].lastMessage = {
            id: msg.id,
            type: msg.type,
            content: msg.content,
            createdAt: msg.createdAt,
            senderId: msg.senderId,
          }
          conversations.value.unshift(conversations.value.splice(idx, 1)[0])
        }

        // Stop typing
        socketComposable.emit('chat:stop_typing', { conversationId: convId })
        typingMap.value.delete(convId)
      }
    } catch (err) {
      showError(err, '发送消息失败')
    }
  }

  function appendMessage(conversationId: number, msg: MessageItem) {
    const list = messagesMap.value.get(conversationId) || []
    // Deduplicate
    if (list.some(m => m.id === msg.id)) return
    list.push(msg)
    messagesMap.value.set(conversationId, list)
  }

  async function loadMoreMessages() {
    if (!currentConversationId.value || !messagesHasMore.value || messagesLoading.value) return
    await fetchMessages(currentConversationId.value, messagesCursor.value ?? undefined)
  }

  async function markConversationRead(conversationId: number) {
    try {
      await markAsReadApi(conversationId)
      socketComposable.emit('chat:mark_read', { conversationId })
    } catch {
      // Silent fail for read receipts
    }
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
        ElMessage.success('已拉黑该用户')
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
        ElMessage.success('已取消拉黑')
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
      handleNewMessage(data as { message: MessageItem })
    })
    socketComposable.on('chat:message_read', (data: unknown) => {
      handleMessageRead(data as { conversationId: number; userId: number })
    })
    socketComposable.on('chat:typing_indicator', (data: unknown) => {
      handleTypingIndicator(data as { conversationId: number; userId: number })
    })
    socketComposable.on('chat:stop_typing_indicator', (data: unknown) => {
      handleStopTypingIndicator(data as { conversationId: number })
    })
    socketComposable.on('chat:conversation_updated', (data: unknown) => {
      handleConversationUpdated(data as { conversation: ConversationListItem })
    })
    socketComposable.on('chat:online_status', (data: unknown) => {
      handleOnlineStatus(data as { userId: number; online: boolean })
    })
    socketComposable.on('chat:blocked', (data: unknown) => {
      handleBlocked(data as { blockedBy: number; blockedUser: number })
    })
    socketComposable.on('chat:unblocked', (data: unknown) => {
      handleUnblocked(data as { unblockedBy: number; unblockedUser: number })
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