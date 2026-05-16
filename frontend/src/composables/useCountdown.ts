import { ref, computed, onUnmounted } from 'vue'

/**
 * 倒计时组合式函数
 * 用于验证码发送后的倒计时
 */
export function useCountdown(initialSeconds = 60) {
  const countdown = ref(0)
  let timer: ReturnType<typeof setInterval> | null = null

  const isCountingDown = computed(() => countdown.value > 0)
  const buttonText = computed(() =>
    countdown.value > 0 ? `${countdown.value}s` : '获取验证码'
  )

  function start() {
    countdown.value = initialSeconds
    if (timer) clearInterval(timer)
    timer = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0 && timer) {
        clearInterval(timer)
        timer = null
      }
    }, 1000)
  }

  function stop() {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
    countdown.value = 0
  }

  onUnmounted(stop)

  return {
    countdown,
    isCountingDown,
    buttonText,
    start,
    stop
  }
}
