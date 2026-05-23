import { ref } from 'vue'

export interface StreamCallbacks {
  onMeta?: (conversationId: number) => void
  onToken?: (content: string) => void
  onCard?: (msgType: string, data: any, content: string) => void
  onStatus?: (phase: string, message: string) => void
  onDone?: () => void
  onError?: (message: string) => void
}

export function useAiStream() {
  const isStreaming = ref(false)
  let abortController: AbortController | null = null

  async function startStream(url: string, body: Record<string, any>, callbacks: StreamCallbacks) {
    isStreaming.value = true
    abortController = new AbortController()

    const baseURL = import.meta.env.VITE_API_BASE_URL || ''
    const token = localStorage.getItem('access_token')

    try {
      const response = await fetch(`${baseURL}${url}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
        credentials: 'include',
        signal: abortController.signal,
      })

      const reader = response.body?.getReader()
      if (!reader) throw new Error('无法连接')
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
            dispatchEvent(event, callbacks)
          } catch { /* skip malformed */ }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        callbacks.onError?.(err.message || '请求失败')
      }
    } finally {
      isStreaming.value = false
      abortController = null
    }
  }

  function dispatchEvent(event: any, cb: StreamCallbacks) {
    switch (event.type) {
      case 'meta': cb.onMeta?.(event.conversationId); break
      case 'token': cb.onToken?.(event.content); break
      case 'card': cb.onCard?.(event.msg_type, event.data, event.content || ''); break
      case 'status': cb.onStatus?.(event.phase, event.message); break
      case 'done': cb.onDone?.(); break
      case 'error': cb.onError?.(event.message); break
    }
  }

  function abort() {
    abortController?.abort()
    abortController = null
    isStreaming.value = false
  }

  return { isStreaming, startStream, abort }
}