<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ content: string; isLoading: boolean; role: 'user' | 'assistant' }>()

const displayContent = computed(() => {
  if (props.role !== 'assistant') return props.content
  return props.content
    .replace(/<\/?text>/g, '')
    .replace(/<hamster>[\s\S]*?<\/hamster>/g, '')
    .replace(/<search_products[^>]*>[\s\S]*?<\/search_products>/g, '')
    .replace(/<get_my_orders[^>]*>[\s\S]*?<\/get_my_orders>/g, '')
    .replace(/<get_my_stats[^>]*>[\s\S]*?<\/get_my_stats>/g, '')
    .replace(/<get_platform_stats[^>]*>[\s\S]*?<\/get_platform_stats>/g, '')
    .replace(/<product_card[^>]*>[\s\S]*?<\/product_card>/g, '')
    .replace(/<order_card[^>]*>[\s\S]*?<\/order_card>/g, '')
    .trim()
})
</script>

<template>
  <div v-if="role === 'assistant'" class="ai-text">{{ displayContent }}<span v-if="isLoading" class="typing-dot">▌</span></div>
  <div v-else class="user-text">{{ content }}<span v-if="isLoading" class="typing-dot">▌</span></div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.ai-text, .user-text {
  padding: 10px 14px; border-radius: $radius-lg; font-size: $font-size-body;
  line-height: $line-height-relaxed; word-break: break-word; white-space: pre-wrap;
}
.user-text {
  background: $color-primary; color: #fff; border-bottom-right-radius: $radius-sm;
}
.ai-text {
  background: $color-bg-card; color: $color-text-primary; border-bottom-left-radius: $radius-sm;
  border: 1px solid $color-border-light;
}
.typing-dot { animation: blink 1s infinite; }
@keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }
</style>