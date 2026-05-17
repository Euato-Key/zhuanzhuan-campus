<script setup lang="ts">
import type { MessageItem } from '@/api/modules/chat'
import { formatRelativeTime } from '@/utils/format'

defineProps<{
  results: MessageItem[]
  keyword: string
  loading: boolean
}>()

defineEmits<{
  search: [keyword: string]
  close: []
  selectResult: [messageId: string]
}>()
</script>

<template>
  <Transition name="slide-down">
    <div class="search-panel">
      <div class="search-header">
        <el-input
          :model-value="keyword"
          placeholder="搜索消息..."
          clearable
          size="default"
          @update:model-value="$emit('search', $event)"
          @clear="$emit('search', '')"
        >
          <template #prefix>
            <el-icon><i class="el-icon-search" /></el-icon>
          </template>
        </el-input>
        <el-button link @click="$emit('close')">关闭</el-button>
      </div>
      <div v-if="loading" class="search-loading" v-loading="true" />
      <div v-else-if="results.length" class="search-results">
        <div
          v-for="msg in results"
          :key="msg.id"
          class="search-result-item"
          @click="$emit('selectResult', msg.id)"
        >
          <div class="result-content">{{ msg.content }}</div>
          <div class="result-meta">
            <span>{{ msg.sender?.username }}</span>
            <span>{{ formatRelativeTime(msg.createdAt) }}</span>
          </div>
        </div>
      </div>
      <div v-else-if="keyword" class="search-empty">未找到相关消息</div>
    </div>
  </Transition>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;
@use '@/assets/styles/mixins' as *;

.search-panel {
  background: $color-bg-card;
  border-bottom: 1px solid $color-border-light;
  box-shadow: $shadow-sm;
}

.search-header {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  padding: $spacing-sm $spacing-md;

  .el-input {
    flex: 1;
  }
}

.search-loading {
  height: 60px;
}

.search-results {
  max-height: 240px;
  overflow-y: auto;
}

.search-result-item {
  padding: $spacing-sm $spacing-md;
  cursor: pointer;
  transition: background $transition-fast;

  &:hover {
    background: $color-primary-pale;
  }

  & + & {
    border-top: 1px solid $color-border-light;
  }
}

.result-content {
  font-size: $font-size-body;
  color: $color-text-primary;
  @include text-ellipsis(2);
}

.result-meta {
  display: flex;
  gap: $spacing-md;
  font-size: $font-size-small;
  color: $color-text-placeholder;
  margin-top: $spacing-xs;
}

.search-empty {
  padding: $spacing-lg;
  text-align: center;
  color: $color-text-placeholder;
  font-size: $font-size-body;
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all $transition-normal;
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}
</style>