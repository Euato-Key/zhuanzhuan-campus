<script setup lang="ts">
import type { QuickReplyItem } from '@/api/modules/chat'

defineProps<{
  replies: QuickReplyItem[]
  loading: boolean
}>()

defineEmits<{
  select: [content: string]
  manage: []
}>()
</script>

<template>
  <div class="quick-reply-panel" v-loading="loading">
    <div class="reply-list">
      <el-button
        v-for="reply in replies"
        :key="reply.id"
        size="small"
        round
        @click="$emit('select', reply.content)"
      >
        {{ reply.content }}
      </el-button>
      <el-button size="small" round type="info" plain @click="$emit('manage')">
        管理
      </el-button>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.quick-reply-panel {
  padding: $spacing-xs $spacing-md;
  border-top: 1px solid $color-border-light;
  background: $color-bg-page;
}

.reply-list {
  display: flex;
  gap: $spacing-xs;
  overflow-x: auto;
  padding-bottom: $spacing-xs;

  &::-webkit-scrollbar {
    height: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: $color-border;
    border-radius: $radius-full;
  }

  .el-button {
    flex-shrink: 0;
    font-size: $font-size-small;
  }
}
</style>