<script setup lang="ts">
defineProps<{
  visible: boolean
}>()
</script>

<template>
  <Transition name="slide">
    <div v-if="visible" class="typing-indicator">
      <span class="typing-text">对方正在输入</span>
      <span class="typing-dots">
        <span class="dot dot-1">.</span>
        <span class="dot dot-2">.</span>
        <span class="dot dot-3">.</span>
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
  animation: dot-blink 1.2s infinite;
}

.dot-1 { animation-delay: 0s; }
.dot-2 { animation-delay: 0.4s; }
.dot-3 { animation-delay: 0.8s; }

@keyframes dot-blink {
  0%, 60%, 100% { opacity: 0.3; }
  30% { opacity: 1; }
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