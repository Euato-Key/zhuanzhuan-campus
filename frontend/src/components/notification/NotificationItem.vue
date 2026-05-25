<template>
  <div
    class="notification-item"
    :class="{ 'is-unread': !notification.isRead }"
    @click="handleClick"
  >
    <span v-if="!notification.isRead" class="unread-dot" />

    <NotificationTypeIcon :type="notification.type" :size="36" />

    <div class="notification-body">
      <div class="notification-header">
        <span class="notification-title">{{ notification.title }}</span>
        <span class="notification-time">{{ formattedTime }}</span>
      </div>
      <p v-if="notification.content" class="notification-content">
        {{ notification.content }}
      </p>
    </div>

    <el-button
      v-if="notification.isRead"
      class="delete-btn"
      type="danger"
      text
      size="small"
      @click.stop="$emit('delete', notification.id)"
    >
      <el-icon><Delete /></el-icon>
    </el-button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { Delete } from '@element-plus/icons-vue'
import NotificationTypeIcon from './NotificationTypeIcon.vue'
import type { Notification, RelatedType } from '@/api/modules/notification'
import { formatRelativeTime } from '@/utils/format'

const props = defineProps<{
  notification: Notification
}>()

const emit = defineEmits<{
  read: [id: number]
  delete: [id: number]
}>()

const router = useRouter()

const formattedTime = computed(() => formatRelativeTime(props.notification.createdAt))

const ROUTE_MAP: Record<RelatedType, string> = {
  product: '/products',
  order: '/orders',
  want_buy: '/want-buy',
  review: '/reviews',
  user: '/user',
  report: '/admin/reports',
}

function handleClick() {
  if (!props.notification.isRead) {
    emit('read', props.notification.id)
  }

  const { relatedType, relatedId } = props.notification
  if (!relatedType || !relatedId) return

  const basePath = ROUTE_MAP[relatedType]
  if (basePath) {
    router.push(`${basePath}/${relatedId}`)
  }
}
</script>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.notification-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  cursor: pointer;
  transition: background-color 0.2s;
  position: relative;
  border-bottom: 1px solid var(--el-border-color-lighter);

  &:hover {
    background-color: var(--el-fill-color-light);
  }

  &:last-child {
    border-bottom: none;
  }
}

.is-unread {
  background-color: var(--el-color-primary-light-9);

  .notification-title {
    font-weight: 600;
  }

  &:hover {
    background-color: var(--el-color-primary-light-8);
  }
}

.unread-dot {
  position: absolute;
  left: 6px;
  top: 20px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: $color-primary;
}

.notification-body {
  flex: 1;
  min-width: 0;
}

.notification-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.notification-title {
  font-size: 14px;
  color: var(--el-text-color-primary);
  line-height: 1.4;
}

.notification-time {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
  flex-shrink: 0;
}

.notification-content {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--el-text-color-regular);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.delete-btn {
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.2s;
}

.notification-item:hover .delete-btn {
  opacity: 1;
}
</style>
