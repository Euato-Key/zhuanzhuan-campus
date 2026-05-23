<script setup lang="ts">
import { Delete } from '@element-plus/icons-vue'
import { useAiAssistantStore } from '@/stores/ai-assistant'
import { formatDate } from '@/utils/format'

const emit = defineEmits<{ (e: 'select'): void }>()
const store = useAiAssistantStore()

async function handleSelect(id: number) {
  await store.selectConversation(id)
  emit('select')
}
</script>

<template>
  <div class="history-view">
    <div class="conv-item" v-for="conv in store.conversations" :key="conv.id"
         :class="{ active: conv.id === store.currentConversationId }"
         @click="handleSelect(conv.id)">
      <div class="conv-title">{{ conv.title || '新对话' }}</div>
      <div class="conv-meta">
        <span class="conv-time">{{ formatDate(conv.updatedAt, 'date') }}</span>
        <el-button text size="small" type="danger" @click.stop="store.deleteConversation(conv.id)">
          <el-icon><Delete /></el-icon>
        </el-button>
      </div>
    </div>
    <div v-if="!store.conversations.length" class="empty-hint">暂无历史会话</div>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;
.history-view { flex: 1; overflow-y: auto; padding: $spacing-sm; }
.conv-item {
  padding: $spacing-sm $spacing-md; border-radius: $radius-md;
  cursor: pointer; margin-bottom: $spacing-xs;
  transition: background $transition-fast;
  &:hover { background: $color-bg-page; }
  &.active { background: rgba($color-primary, 0.08); }
}
.conv-title { font-size: $font-size-body; color: $color-text-primary; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.conv-meta { display: flex; justify-content: space-between; align-items: center; margin-top: 2px; }
.conv-time { font-size: $font-size-tiny; color: $color-text-placeholder; }
.empty-hint { text-align: center; color: $color-text-placeholder; padding: $spacing-lg 0; font-size: $font-size-small; }
</style>