<script setup lang="ts">
import { useUserStore } from '@/stores/user'
import { useAuthDialog } from '@/composables/useAuthDialog'

const emit = defineEmits<{
  (e: 'click'): void
}>()

const userStore = useUserStore()

function handleClick() {
  if (!userStore.isLoggedIn) {
    useAuthDialog().open('login')
    return
  }
  emit('click')
}
</script>

<template>
  <button class="btn-ai-primary" @click="handleClick">
    <svg class="ai-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L14.5 9H22L16 13.5L18.5 21L12 16.5L5.5 21L8 13.5L2 9H9.5L12 2Z" fill="currentColor" opacity="0.6"/>
      <circle cx="12" cy="12" r="3" fill="currentColor"/>
    </svg>
    <span>AI 智能发布</span>
  </button>
</template>

<style scoped lang="scss">
.btn-ai-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  cursor: pointer;
  background: linear-gradient(135deg, #4CAF50, #2196F3);
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
  transition: all 0.25s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(76, 175, 80, 0.4);
  }

  &:active {
    transform: scale(0.98);
  }

  .ai-icon {
    width: 18px;
    height: 18px;
    animation: ai-sparkle 2s ease-in-out infinite;
  }
}

@keyframes ai-sparkle {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.15); }
}
</style>