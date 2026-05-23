<script setup lang="ts">
import AiQuickQuestions from './AiQuickQuestions.vue'
import { useAiAssistantStore } from '@/stores/ai-assistant'

const store = useAiAssistantStore()
</script>

<template>
  <div class="welcome-view">
    <div class="welcome-icon">🤖</div>
    <h3 class="welcome-title">转转小助手</h3>
    <p class="welcome-desc">你好！我是转转校园的AI助手，可以帮你搜索商品、查询订单、了解平台数据等。试试下面的快捷问题吧！</p>
    <AiQuickQuestions @ask="store.sendMessage" />
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;
.welcome-view { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: $spacing-xl; text-align: center; }
.welcome-icon { font-size: 48px; margin-bottom: $spacing-md; }
.welcome-title { font-size: $font-size-h3; color: $color-text-primary; margin-bottom: $spacing-sm; }
.welcome-desc { font-size: $font-size-body; color: $color-text-secondary; line-height: $line-height-relaxed; margin-bottom: $spacing-lg; max-width: 280px; }
</style>