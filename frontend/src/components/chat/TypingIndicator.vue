<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

defineProps<{
  visible: boolean
}>()

const dots = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  timer = setInterval(() => {
    dots.value = (dots.value + 1) % 4
  }, 400)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <Transition name="slide">
    <div v-if="visible" class="typing-indicator">
      <span class="typing-text">对方正在输入</span>
      <span class="typing-dots">
        <span v-for="i in 3" :key="i" class="dot" :class="{ active: i <= dots }">.</span>
      </span>
    </div>
  </Transition>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.typing-indicator {
  padding: $spacing-xs $spacing-md;
  font-size: $font-size-small;
  color: $color-text-secondary;
  display: flex;
  align-items: center;
  gap: 2px;
}

.typing-dots .dot {
  opacity: 0.3;
  transition: opacity 0.2s ease;

  &.active {
    opacity: 1;
  }
}

.slide-enter-active,
.slide-leave-active {
  transition: all $transition-fast;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>