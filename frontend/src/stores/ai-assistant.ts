import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { useUserStore } from './user'
import type { AIConversation } from '@/api/modules/ai'

export interface UIMessage {
  id: number
  role: 'user' | 'assistant'
  content: string
  msgType: string       // text | product_card | order_card | chart
  cardData?: any         // card types have card data
  isLoading?: boolean    // AI response in progress
  createdAt: string
}

export const useAiAssistantStore = defineStore('ai-assistant', () => {
  const userStore = useUserStore()
  
  const panelVisible = ref(false)
  const isLoading = ref(false)
  const conversations = ref<AIConversation[]>([])
  const currentConversationId = ref<number | null>(null)
  const messages = ref<UIMessage[]>([])
  let abortController: AbortController | null = null

  const isLoggedIn = computed(() => userStore.isLoggedIn)

  function visibleFAB() {
    panelVisible.value = !panelVisible.value;
    if (panelVisible.value && messages.value.length === 0) { loadConversations(); }
  }

  function open() { panelVisible.value = true; }
  function close() { panelVisible.value = false; }

  async function loadConversations() {
    try {
      const res = await (await import('@/api/modules/ai')).getAssistantConversations()
      if (res.data.code === 200) conversations.value = res.data.data || []
    } catch { /* silent */ }
  }

  async function newConversation() {
    currentConversationId.value = null
    messages.value = []
  }

  async function deleteConversation(id: number) {
    await (await import('@/api/modules/ai')).deleteAssistantConversation(id)
    if (currentConversationId.value === id) newConversation()
    await loadConversations()
  }

  async function sendMessage(text: string) {
    if (!text.trim() || isLoading.value) return
    const content = text.trim().slice(0, 500)

    const userMsg: UIMessage = {
      id: Date.now(), role: 'user', content,
      msgType: 'text', createdAt: new Date().toISOString(),
    }
    messages.value.push(userMsg)

    // Add loading placeholder
    const aiMsg: UIMessage = {
      id: Date.now() + 1, role: 'assistant', content: '',
      msgType: 'text', isLoading: true, createdAt: new Date().toISOString(),
    }
    messages.value.push(aiMsg)
    const aiIndex = messages.value.length - 1

    isLoading.value = true
    const baseURL = import.meta.env.VITE_API_BASE_URL || ''

    abortController = new AbortController()

    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${baseURL}/ai/assistant/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' },
        body: JSON.stringify({ conversationId: currentConversationId.value, message: content }),
        credentials: 'include',
        signal: abortController.signal,
      })

      const reader = response.body?.getReader()
      if (!reader) { throw new Error('无法连接') }
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const dataStr = line.slice(6).trim()
          if (dataStr === '[DONE]') continue
          try {
            const event = JSON.parse(dataStr)
            if (event.type === 'meta' && event.conversationId) {
              currentConversationId.value = event.conversationId
              loadConversations()
            } else if (event.type === 'token') {
              messages.value[aiIndex].content += event.content
            } else if (event.type === 'card') {
              messages.value[aiIndex].msgType = event.msg_type || 'product_card'
              messages.value[aiIndex].cardData = event.data
              messages.value[aiIndex].content = event.content || ''
              messages.value[aiIndex].isLoading = false
            } else if (event.type === 'done') {
              messages.value[aiIndex].isLoading = false
              messages.value[aiIndex].id = event.messageId
            } else if (event.type === 'error') {
              messages.value[aiIndex].content = event.message || 'AI服务异常'
              messages.value[aiIndex].isLoading = false
            }
          } catch { /* skip malformed events */ }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        messages.value[aiIndex].content = '请求失败，请稍后重试'
        messages.value[aiIndex].isLoading = false
      }
    } finally {
      isLoading.value = false
      abortController = null
    }
  }

  function stopGeneration() {
    if (abortController) {
      abortController.abort()
      abortController = null
      isLoading.value = false
    }
  }

  return {
    panelVisible, isLoading, conversations, currentConversationId, messages, isLoggedIn,
    visibleFAB, open, close, loadConversations, newConversation, deleteConversation, sendMessage, stopGeneration,
  }
})
