<template>
  <el-popover
    :visible="popoverVisible"
    placement="bottom-end"
    :width="380"
    trigger="click"
    :offset="8"
    @update:visible="popoverVisible = $event"
  >
    <template #reference>
      <span class="notification-trigger">
        <el-badge :value="store.unreadCount.total" :hidden="!store.hasUnread" :max="99">
          <el-icon :size="20">
            <Bell />
          </el-icon>
        </el-badge>
      </span>
    </template>

    <div class="popover-header">
      <span class="popover-title">通知</span>
      <el-button
        v-if="store.hasUnread"
        type="primary"
        text
        size="small"
        @click="handleMarkAllRead"
      >
        全部已读
      </el-button>
    </div>

    <div v-if="recentNotifications.length > 0" class="popover-list">
      <div
        v-for="item in recentNotifications"
        :key="item.id"
        class="popover-item"
        :class="{ 'is-unread': !item.isRead }"
        @click="handleItemClick(item)"
      >
        <NotificationTypeIcon :type="item.type" :size="28" />
        <div class="popover-item-body">
          <span class="popover-item-title">{{ item.title }}</span>
          <span class="popover-item-time">{{ formatRelativeTime(item.createdAt) }}</span>
        </div>
      </div>
    </div>

    <el-empty v-else description="暂无通知" :image-size="60" />

    <div class="popover-footer">
      <router-link to="/notifications" class="view-all-link" @click="popoverVisible = false">
        查看全部通知
      </router-link>
    </div>
  </el-popover>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Bell } from '@element-plus/icons-vue'
import NotificationTypeIcon from './NotificationTypeIcon.vue'
import { useNotificationStore } from '@/stores/notification'
import type { Notification } from '@/api/modules/notification'
import { formatRelativeTime } from '@/utils/format'

const store = useNotificationStore()
const popoverVisible = ref(false)

const recentNotifications = computed(() => store.notifications.slice(0, 5))

watch(popoverVisible, (val) => {
  if (val) {
    store.fetchNotifications(true)
  }
})

function handleItemClick(item: Notification) {
  if (!item.isRead) {
    store.markAsRead(item.id)
  }
  popoverVisible.value = false
  store.viewDetail(item.id)
}

async function handleMarkAllRead() {
  await store.markAllAsRead()
}
</script>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.popover-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  margin-bottom: 4px;
}

.popover-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.popover-list {
  max-height: 320px;
  overflow-y: auto;
}

.popover-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 4px;
  cursor: pointer;
  border-radius: $radius-sm;
  transition: background-color 0.15s;

  &:hover {
    background-color: var(--el-fill-color-light);
  }
}

.is-unread {
  .popover-item-title {
    font-weight: 600;
  }
}

.popover-item-body {
  flex: 1;
  min-width: 0;
}

.popover-item-title {
  display: block;
  font-size: 13px;
  color: var(--el-text-color-primary);
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.popover-item-time {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.popover-footer {
  padding-top: 8px;
  border-top: 1px solid var(--el-border-color-lighter);
  text-align: center;
}

.view-all-link {
  font-size: 13px;
  color: $color-primary;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
}

.notification-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--el-text-color-regular);
  transition: color 0.2s;

  &:hover {
    color: $color-primary;
  }

  :deep(.el-badge) {
    display: inline-flex;
    align-items: center;
  }

  :deep(.el-icon) {
    display: flex;
  }
}
</style>
