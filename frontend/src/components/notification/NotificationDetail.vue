<template>
  <el-dialog
    :model-value="visible"
    @update:model-value="$emit('update:visible', $event)"
    width="480px"
    :show-close="true"
    class="notification-detail-dialog"
  >
    <template v-if="notification">
      <div class="detail-header">
        <NotificationTypeIcon :type="notification.type" :size="40" />
        <div class="detail-title-area">
          <h3 class="detail-title">{{ notification.title }}</h3>
          <span class="detail-time">{{ formattedTime }}</span>
        </div>
      </div>

      <div class="detail-body">
        <p v-if="notification.content" class="detail-content">{{ notification.content }}</p>

        <div v-if="notification.relatedType" class="related-card">
          <div class="related-label">
            <el-icon :size="14"><Link /></el-icon>
            <span>{{ relatedLabel }}</span>
          </div>
          <el-button type="primary" text size="small" @click="navigateToRelated">
            {{ relatedActionText }} →
          </el-button>
        </div>
      </div>

      <div class="detail-footer">
        <el-button @click="$emit('update:visible', false)">关闭</el-button>
        <el-button
          v-if="notification.relatedType"
          type="primary"
          @click="navigateToRelated"
        >
          {{ relatedActionText }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { Link } from '@element-plus/icons-vue'
import NotificationTypeIcon from './NotificationTypeIcon.vue'
import type { Notification, RelatedType } from '@/api/modules/notification'
import { NOTIFICATION_TYPE_LABELS } from '@/api/modules/notification'
import { formatDate } from '@/utils/format'

const props = defineProps<{
  visible: boolean
  notification: Notification | null
}>()

defineEmits<{
  'update:visible': [val: boolean]
}>()

const router = useRouter()

const formattedTime = computed(() => {
  if (!props.notification) return ''
  return formatDate(props.notification.createdAt, 'full')
})

const RELATED_LABELS: Record<RelatedType, string> = {
  order: '关联订单',
  product: '关联商品',
  review: '关联评价',
  user: '关联用户',
  want_buy: '关联求购',
}

const RELATED_ACTIONS: Record<RelatedType, string> = {
  order: '查看订单',
  product: '查看商品',
  review: '查看评价',
  user: '查看用户',
  want_buy: '查看求购',
}

const RELATED_ROUTES: Record<RelatedType, string> = {
  product: '/products',
  order: '/orders',
  want_buy: '/want-buy',
  review: '/reviews',
  user: '/user',
}

const relatedLabel = computed(() => {
  if (!props.notification?.relatedType) return ''
  return RELATED_LABELS[props.notification.relatedType]
})

const relatedActionText = computed(() => {
  if (!props.notification?.relatedType) return ''
  return RELATED_ACTIONS[props.notification.relatedType]
})

function navigateToRelated() {
  if (!props.notification?.relatedType || !props.notification?.relatedId) return
  const basePath = RELATED_ROUTES[props.notification.relatedType]
  if (basePath) {
    router.push(`${basePath}/${props.notification.relatedId}`)
  }
}
</script>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.detail-header {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  margin-bottom: 20px;
}

.detail-title-area {
  flex: 1;
}

.detail-title {
  margin: 0 0 4px;
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  line-height: 1.4;
}

.detail-time {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.detail-body {
  margin-bottom: 20px;
}

.detail-content {
  margin: 0 0 16px;
  font-size: 14px;
  color: var(--el-text-color-regular);
  line-height: 1.6;
  white-space: pre-wrap;
}

.related-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: var(--el-fill-color-light);
  border-radius: $radius-md;
}

.related-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.detail-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
