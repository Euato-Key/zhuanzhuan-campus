import { ref } from 'vue'
import { io, Socket } from 'socket.io-client'

const socket = ref<Socket | null>(null)
const connected = ref(false)
const connecting = ref(false)

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
    })

    s.on('disconnect', () => {
      connected.value = false
    })

    s.on('connect_error', () => {
      connecting.value = false
    })

    // Re-auth on reconnect (token may have been refreshed)
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

  function on(event: string, handler: (...args: unknown[]) => void) {
    socket.value?.on(event, handler)
  }

  function off(event: string, handler?: (...args: unknown[]) => void) {
    socket.value?.off(event, handler)
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