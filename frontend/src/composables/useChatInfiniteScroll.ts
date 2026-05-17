import { ref, onMounted, onUnmounted, type Ref } from 'vue'

export function useChatInfiniteScroll(
  containerRef: Ref<HTMLElement | null>,
  onLoadMore: () => Promise<void>,
  options = { threshold: 50 }
) {
  const isLoadingMore = ref(false)
  let oldScrollHeight = 0

  async function handleScroll() {
    const el = containerRef.value
    if (!el) return

    if (el.scrollTop < options.threshold && !isLoadingMore.value) {
      isLoadingMore.value = true
      oldScrollHeight = el.scrollHeight

      await onLoadMore()

      // Restore scroll position after prepending messages
      requestAnimationFrame(() => {
        if (containerRef.value) {
          containerRef.value.scrollTop = containerRef.value.scrollHeight - oldScrollHeight + containerRef.value.scrollTop
        }
        isLoadingMore.value = false
      })
    }
  }

  function scrollToBottom(smooth = true) {
    const el = containerRef.value
    if (!el) return
    el.scrollTo({
      top: el.scrollHeight,
      behavior: smooth ? 'smooth' : 'instant',
    })
  }

  function isNearBottom(threshold = 100): boolean {
    const el = containerRef.value
    if (!el) return false
    return el.scrollHeight - el.scrollTop - el.clientHeight < threshold
  }

  onMounted(() => {
    containerRef.value?.addEventListener('scroll', handleScroll, { passive: true })
  })

  onUnmounted(() => {
    containerRef.value?.removeEventListener('scroll', handleScroll)
  })

  return {
    isLoadingMore,
    scrollToBottom,
    isNearBottom,
  }
}