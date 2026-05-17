<script setup lang="ts">
import { computed } from 'vue'
import type { MessageItem, ProductCardContent, OrderCardContent } from '@/api/modules/chat'
import { formatRelativeTime } from '@/utils/format'
import { getOssUrl } from '@/utils/oss'
import ProductCardMessage from './ProductCardMessage.vue'
import OrderCardMessage from './OrderCardMessage.vue'
import ReadStatusBadge from './ReadStatusBadge.vue'

const props = defineProps<{
  message: MessageItem
  isOwn: boolean
  showAvatar: boolean
  showTime: boolean
}>()

const parsedContent = computed(() => {
  if (props.message.type !== 'product' && props.message.type !== 'order') return null
  try {
    return JSON.parse(props.message.content) as ProductCardContent | OrderCardContent
  } catch {
    return null
  }
})

const imageUrl = computed(() => {
  if (props.message.type !== 'image') return ''
  return getOssUrl(props.message.content)
})
</script>

<template>
  <div class="message-bubble" :class="{ own: isOwn, other: !isOwn }">
    <div v-if="showTime" class="msg-time">{{ formatRelativeTime(message.createdAt) }}</div>
    <div class="msg-row">
      <template v-if="!isOwn">
        <el-avatar v-if="showAvatar" :size="36" :src="message.sender?.avatar ? getOssUrl(message.sender.avatar) : undefined" class="msg-avatar">
          {{ message.sender?.username?.charAt(0) || '?' }}
        </el-avatar>
        <div v-else class="msg-avatar-placeholder" />
      </template>
      <div class="msg-content">
        <div class="bubble" :class="`type-${message.type}`">
          <template v-if="message.type === 'text'">
            <span class="text-content">{{ message.content }}</span>
          </template>
          <template v-else-if="message.type === 'image'">
            <el-image
              :src="imageUrl"
              :preview-src-list="[imageUrl]"
              fit="cover"
              class="image-content"
            />
          </template>
          <template v-else-if="message.type === 'product'">
            <ProductCardMessage v-if="parsedContent" :content="parsedContent as ProductCardContent" />
            <span v-else class="text-content">[商品卡片]</span>
          </template>
          <template v-else-if="message.type === 'order'">
            <OrderCardMessage v-if="parsedContent" :content="parsedContent as OrderCardContent" />
            <span v-else class="text-content">[订单卡片]</span>
          </template>
        </div>
        <ReadStatusBadge v-if="isOwn" :read-at="message.readAt" />
      </div>
      <template v-if="isOwn">
        <el-avatar v-if="showAvatar" :size="36" :src="message.sender?.avatar ? getOssUrl(message.sender.avatar) : undefined" class="msg-avatar">
          {{ message.sender?.username?.charAt(0) || '?' }}
        </el-avatar>
        <div v-else class="msg-avatar-placeholder" />
      </template>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.message-bubble {
  margin-bottom: $spacing-sm;
  display: flex;
  flex-direction: column;

  &.own { align-items: flex-end; }
  &.other { align-items: flex-start; }
}

.msg-time {
  font-size: $font-size-tiny;
  color: $color-text-placeholder;
  margin-bottom: $spacing-xs;
  text-align: center;
}

.msg-row {
  display: flex;
  align-items: flex-end;
  gap: $spacing-sm;
}

.msg-avatar {
  flex-shrink: 0;
}

.msg-avatar-placeholder {
  width: 36px;
  flex-shrink: 0;
}

.msg-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-width: 70%;
}

.bubble {
  padding: $spacing-sm $spacing-md;
  border-radius: $radius-lg;
  word-break: break-word;
  line-height: $line-height-normal;

  .other & {
    background: $color-bg-card;
    border: 1px solid $color-border-light;
    border-top-left-radius: $radius-sm;
  }

  .own & {
    background: $color-primary;
    color: #fff;
    border-top-right-radius: $radius-sm;
  }
}

.text-content {
  white-space: pre-wrap;
}

.image-content {
  max-width: 200px;
  max-height: 200px;
  border-radius: $radius-sm;
  cursor: pointer;
}

.type-image .bubble {
  padding: $spacing-xs;
}
</style>