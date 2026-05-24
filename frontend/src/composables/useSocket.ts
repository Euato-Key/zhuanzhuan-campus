import { ref } from 'vue'
import { io, Socket } from 'socket.io-client'

const socket = ref<Socket | null>(null)
const connected = ref(false)
const connecting = ref(false)

const eventHandlers = new Map<string, Set<Function>>()

function getSocketUrl(): string {
  return import.meta.env.VITE_SOCKET_URL || '/'
}

function getAuthToken(): string | null {
  return localStorage.getItem('access_token')
}

export function useSocket() {
  function connect() {
    if (socket.value?.connected || connecting.value) return

    connecting.value = true
    const token = getAuthToken()
    if (!token) {
      connecting.value = false
      return
    }

    const s = io(getSocketUrl(), {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    })

    s.on('connect', () => {
      connected.value = true
      connecting.value = false
      // Re-register all event handlers on reconnect
      eventHandlers.forEach((handlers, event) => {
        handlers.forEach(handler => s.on(event, handler as (...args: unknown[]) => void))
      })
    })

    s.on('disconnect', () => {
      connected.value = false
    })

    s.on('connect_error', () => {
      connecting.value = false
    })

    s.on('reconnect_attempt', () => {
      const newToken = getAuthToken()
      if (newToken) {
        s.auth = { token: newToken }
      }
    })

    socket.value = s
  }

  function disconnect() {
    if (socket.value) {
      socket.value.disconnect()
      socket.value = null
    }
    connected.value = false
    connecting.value = false
  }

  function emit(event: string, data?: unknown) {
    if (!socket.value?.connected) return
    socket.value.emit(event, data)
  }

  function on<T extends unknown[] = unknown[]>(event: string, handler: (...args: T) => void) {
    if (!eventHandlers.has(event)) eventHandlers.set(event, new Set())
    eventHandlers.get(event)!.add(handler)
    socket.value?.on(event, handler as (...args: unknown[]) => void)
  }

  function off<T extends unknown[] = unknown[]>(event: string, handler?: (...args: T) => void) {
    if (handler) {
      eventHandlers.get(event)?.delete(handler)
      socket.value?.off(event, handler as (...args: unknown[]) => void)
    } else {
      eventHandlers.delete(event)
      socket.value?.off(event)
    }
  }

  function joinConversation(id: number) {
    emit('chat:join', { conversationId: id })
  }

  function leaveConversation(id: number) {
    emit('chat:leave', { conversationId: id })
  }

  return {
    socket,
    connected,
    connecting,
    connect,
    disconnect,
    emit,
    on,
    off,
    joinConversation,
    leaveConversation,
  }
}