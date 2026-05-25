import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { useUserStore } from './user'
import { useAiStream } from '@/composables/useAiStream'
import type { AIConversation } from '@/api/modules/ai'

export interface ProductCardItem {
  id: number
  name: string
  currentPrice: number
  images: string[]
  itemCondition: string
  favoriteCount: number
  deliveryType: string
  categoryId?: number
  categoryName?: string
}

export interface OrderCardItem {
  id: number
  orderNo: string
  status: string
  totalPrice: number
  productName: string
  createdAt: string
  type?: string
  buyerId?: number
  sellerId?: number
}

export interface CardData {
  cardType: string
  data: ProductCardItem[] | OrderCardItem[]
  textBeforeLength?: number
}

export interface UIMessage {
  id: number
  role: 'user' | 'assistant'
  content: string
  msgType: string
  cardData?: ProductCardItem[] | OrderCardItem[]
  cards?: CardData[]
  isLoading?: boolean
  createdAt: string
}

export const useAiAssistantStore = defineStore('ai-assistant', () => {
  const userStore = useUserStore()
  const { isStreaming, startStream, abort: abortStream } = useAiStream()

  const panelVisible = ref(false)
  const isLoading = ref(false)
  const conversations = ref<AIConversation[]>([])
  const currentConversationId = ref<number | null>(null)
  const messages = ref<UIMessage[]>([])
  const statusPhase = ref('')
  const statusMessage = ref('')

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

  async function loadConversationMessages(convId: number) {
    try {
      const { default: api } = await import('@/api/index')
      const res = await api.get(`/ai/assistant/conversations/${convId}/messages`)
      if (res.data.code === 200) {
        const rawMsgs = res.data.data || []

        // Merge consecutive assistant messages: text + card pairs into single mixed messages
        const merged: UIMessage[] = []
        let i = 0
        while (i < rawMsgs.length) {
          const m = rawMsgs[i]
          if (m.role === 'user') {
            merged.push({
              id: m.id, role: 'user', content: m.content,
              msgType: 'text', isLoading: false, createdAt: m.createdAt,
            })
            i++
          } else if (m.role === 'assistant') {
            let textMsg: typeof m | null = m.msgType === 'text' ? m : null
            const cards: CardData[] = []

            // Collect consecutive assistant messages (text + cards)
            while (i < rawMsgs.length && rawMsgs[i].role === 'assistant') {
              const cur = rawMsgs[i]
              if (cur.msgType === 'mixed' && cur.extraData?.cards) {
                // Mixed message: extract cards from extraData.cards
                for (const c of cur.extraData.cards) {
                  cards.push({ cardType: c.type, data: c.data })
                }
                if (cur.content.trim()) {
                  if (!textMsg || !textMsg.content.trim()) textMsg = cur
                }
              } else if (cur.msgType === 'text' && cur.content.trim()) {
                if (!textMsg || !textMsg.content.trim()) textMsg = cur
              } else if (cur.msgType !== 'text' && cur.extraData) {
                cards.push({ cardType: cur.msgType, data: cur.extraData })
              }
              i++
            }

            merged.push({
              id: textMsg?.id || m.id,
              role: 'assistant',
              content: textMsg?.content || '',
              msgType: cards.length > 0 ? 'mixed' : 'text',
              cards: cards.length > 0 ? cards : undefined,
              isLoading: false,
              createdAt: textMsg?.createdAt || m.createdAt,
            })
          } else {
            i++
          }
        }

        messages.value = merged
      }
    } catch { /* silent */ }
  }

  async function selectConversation(id: number) {
    currentConversationId.value = id
    await loadConversationMessages(id)
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

    const aiMsg: UIMessage = {
      id: Date.now() + 1, role: 'assistant', content: '',
      msgType: 'text', cards: [], isLoading: true, createdAt: new Date().toISOString(),
    }
    messages.value.push(aiMsg)
    const aiIndex = messages.value.length - 1

    isLoading.value = true

    await startStream('/ai/assistant/chat', { conversationId: currentConversationId.value, message: content }, {
      onMeta: (conversationId) => {
        currentConversationId.value = conversationId
        loadConversations()
      },
      onToken: (tokenContent) => {
        messages.value[aiIndex].content += tokenContent
        statusMessage.value = ''
      },
      onCard: (msgType, data) => {
        messages.value[aiIndex].cards!.push({ cardType: msgType || 'product_card', data, textBeforeLength: messages.value[aiIndex].content.length })
        if (messages.value[aiIndex].msgType === 'text') {
          messages.value[aiIndex].msgType = 'mixed'
        }
        statusMessage.value = ''
      },
      onDone: () => {
        messages.value[aiIndex].isLoading = false
        statusMessage.value = ''
      },
      onStatus: (phase, msg) => {
        statusPhase.value = phase
        statusMessage.value = msg
      },
      onError: (errorMsg) => {
        messages.value[aiIndex].content = errorMsg || 'AI服务异常'
        messages.value[aiIndex].isLoading = false
        statusMessage.value = ''
      },
    })

    isLoading.value = false
  }

  function stopGeneration() {
    abortStream()
    isLoading.value = false
  }

  return {
    panelVisible, isLoading, conversations, currentConversationId, messages, isLoggedIn,
    statusPhase, statusMessage,
    visibleFAB, open, close, loadConversations, newConversation, deleteConversation, selectConversation, sendMessage, stopGeneration,
  }
})