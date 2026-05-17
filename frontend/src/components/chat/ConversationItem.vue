<script setup lang="ts">
import type { ConversationListItem } from '@/api/modules/chat'
import { formatRelativeTime } from '@/utils/format'
import { getOssUrl } from '@/utils/oss'
import OnlineDot from './OnlineDot.vue'

defineProps<{
  conversation: ConversationListItem
  isActive: boolean
}>()

defineEmits<{
  click: []
}>()

function getLastMessagePreview(msg: ConversationListItem['lastMessage']): string {
  if (!msg) return ''
  switch (msg.type) {
    case 'image': return '[图片]'
    case 'product': return '[商品]'
    case 'order': return '[订单]'
    default: return msg.content.length > 30 ? msg.content.slice(0, 30) + '...' : msg.content
  }
}
</script>

<template>
  <div class="conversation-item" :class="{ active: isActive }" @click="$emit('click')">
    <div class="conv-avatar-wrap">
      <el-avatar :size="48" :src="conversation.otherUser.avatar ? getOssUrl(conversation.otherUser.avatar) : undefined">
        {{ conversation.otherUser.username?.charAt(0) || '?' }}
      </el-avatar>
      <OnlineDot :online="false" />
    </div>
    <div class="conv-info">
      <div class="conv-top-row">
        <span class="conv-name">{{ conversation.otherUser.username }}</span>
        <el-tag v-if="conversation.otherUser.school" size="small" type="info" effect="plain">
          {{ conversation.otherUser.school }}
        </el-tag>
      </div>
      <div class="conv-bottom-row">
        <span class="conv-last-msg">{{ getLastMessagePreview(conversation.lastMessage) }}</span>
        <span class="conv-time">{{ conversation.lastMessage ? formatRelativeTime(conversation.lastMessage.createdAt) : '' }}</span>
      </div>
    </div>
    <el-badge v-if="conversation.unreadCount > 0" :value="conversation.unreadCount" :max="99" class="conv-badge" />
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;
@use '@/assets/styles/mixins' as *;

.conversation-item {
  display: flex;
  align-items: center;
  gap: $spacing-md;
  padding: $spacing-md;
  cursor: pointer;
  transition: all $transition-fast;
  border-left: 3px solid transparent;

  &:hover {
    background: $color-primary-pale;
  }

  &.active {
    background: $color-primary-pale;
    border-left-color: $color-primary;
  }
}

.conv-avatar-wrap {
  position: relative;
  flex-shrink: 0;
}

.conv-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
}

.conv-top-row {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
}

.conv-name {
  font-size: $font-size-body;
  font-weight: $font-weight-medium;
  color: $color-text-primary;
  @include text-ellipsis(1);
}

.conv-bottom-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: $spacing-sm;
}

.conv-last-msg {
  font-size: $font-size-small;
  color: $color-text-secondary;
  @include text-ellipsis(1);
  flex: 1;
}

.conv-time {
  font-size: $font-size-tiny;
  color: $color-text-placeholder;
  white-space: nowrap;
  flex-shrink: 0;
}

.conv-badge {
  flex-shrink: 0;

  :deep(.el-badge__content) {
    font-size: $font-size-tiny;
  }
}
</style>