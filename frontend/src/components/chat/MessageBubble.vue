<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import type { MessageItem, ProductCardContent, OrderCardContent } from '@/api/modules/chat'
import { getOssUrl } from '@/utils/oss'
import ProductCardMessage from './ProductCardMessage.vue'
import OrderCardMessage from './OrderCardMessage.vue'
import ReadStatusBadge from './ReadStatusBadge.vue'

const router = useRouter()

const props = defineProps<{
  message: MessageItem
  isOwn: boolean
  showAvatar: boolean
  highlight?: boolean
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
  <div
    class="message-bubble"
    :class="{ own: isOwn, other: !isOwn, highlight: props.highlight }"
    :data-message-id="message.id"
  >
    <div class="msg-row">
      <template v-if="!isOwn">
        <el-avatar v-if="showAvatar" :size="36" :src="message.sender?.avatar ? getOssUrl(message.sender.avatar) : undefined" class="msg-avatar clickable" @click="router.push({ name: 'UserProfile', params: { id: message.senderId } })">
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
        <el-avatar v-if="showAvatar" :size="36" :src="message.sender?.avatar ? getOssUrl(message.sender.avatar) : undefined" class="msg-avatar clickable" @click="router.push({ name: 'UserProfile', params: { id: message.senderId } })">
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
  max-width: 75%;

  &.own {
    align-items: flex-end;
    margin-left: auto;
  }
  &.other {
    align-items: flex-start;
    margin-right: auto;
  }
}

.msg-row {
  display: flex;
  align-items: flex-start;
  gap: $spacing-sm;
}

.msg-avatar {
  flex-shrink: 0;

  &.clickable {
    cursor: pointer;
    transition: opacity $transition-fast;

    &:hover {
      opacity: 0.8;
    }
  }
}

.msg-avatar-placeholder {
  width: 36px;
  flex-shrink: 0;
}

.msg-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
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

.message-bubble.highlight {
  animation: highlight-pulse 2s ease-out;
}

@keyframes highlight-pulse {
  0% {
    background: rgba($color-primary, 0.3);
  }
  100% {
    background: transparent;
  }
}
</style>