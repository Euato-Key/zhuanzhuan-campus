import { ref } from 'vue'

type AuthMode = 'login' | 'register' | 'forgotPassword'

const visible = ref(false)
const mode = ref<AuthMode>('login')

export function useAuthDialog() {
  function open(newMode: AuthMode = 'login') {
    mode.value = newMode
    visible.value = true
  }

  function close() {
    visible.value = false
  }

  function switchTo(newMode: AuthMode) {
    mode.value = newMode
  }

  return {
    visible,
    mode,
    open,
    close,
    switchTo,
  }
}