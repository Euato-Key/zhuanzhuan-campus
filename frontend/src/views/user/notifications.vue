<template>
  <AppLayout>
    <div class="notifications-page">
      <div class="page-banner">
        <div class="banner-accent" />
        <div class="banner-content">
          <div class="banner-text">
            <h2 class="banner-title">通知中心</h2>
            <p class="banner-desc">查看系统通知、订单动态、商品审核等消息</p>
          </div>
          <el-button
            v-if="store.hasUnread"
            type="primary"
            plain
            round
            @click="handleMarkAllRead"
          >
            <el-icon><Check /></el-icon>
            全部标记已读
          </el-button>
        </div>
      </div>

      <el-tabs v-model="activeTab" class="notification-tabs" @tab-change="handleTabChange">
        <el-tab-pane label="全部" name="">
          <template #label>
            <span>全部<el-badge v-if="store.unreadCount.total > 0" :value="store.unreadCount.total" :max="99" class="tab-badge" /></span>
          </template>
        </el-tab-pane>

        <el-tab-pane
          v-for="nt in tabTypes"
          :key="nt"
          :label="nt"
          :name="nt"
        >
          <template #label>
            <span>{{ NOTIFICATION_TYPE_LABELS[nt] }}<el-badge v-if="store.unreadByType[nt]" :value="store.unreadByType[nt]!" :max="99" class="tab-badge" /></span>
          </template>
        </el-tab-pane>
      </el-tabs>

      <NotificationList />

      <NotificationDetail
        :visible="store.detailVisible"
        :notification="store.currentNotification"
        @update:visible="store.detailVisible = $event"
      />
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Check } from '@element-plus/icons-vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import NotificationList from '@/components/notification/NotificationList.vue'
import NotificationDetail from '@/components/notification/NotificationDetail.vue'
import { useNotificationStore } from '@/stores/notification'
import { NOTIFICATION_TYPE_LABELS } from '@/api/modules/notification'
import type { NotificationType } from '@/api/modules/notification'

const store = useNotificationStore()

const tabTypes: NotificationType[] = ['system', 'product', 'order', 'review', 'interaction']
const activeTab = ref<string>('')

function handleTabChange(name: string | number) {
  store.setFilterType(name as NotificationType | '')
}

function handleMarkAllRead() {
  const type = activeTab.value ? (activeTab.value as NotificationType) : undefined
  store.markAllAsRead(type)
}

onMounted(() => {
  store.fetchNotifications(true)
})
</script>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.notifications-page {
  padding: 24px 0;
}

.page-banner {
  position: relative;
  background: #fff;
  border-radius: $radius-lg;
  padding: 24px 28px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.banner-accent {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: $color-primary;
  border-radius: $radius-lg 0 0 $radius-lg;
}

.banner-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.banner-title {
  margin: 0 0 6px;
  font-size: 20px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.banner-desc {
  margin: 0;
  font-size: 14px;
  color: var(--el-text-color-secondary);
}

.notification-tabs {
  margin-bottom: 16px;

  :deep(.el-tabs__item) {
    font-size: 14px;
  }
}

.tab-badge {
  margin-left: 4px;

  :deep(.el-badge__content) {
    font-size: 10px;
    height: 16px;
    line-height: 16px;
    padding: 0 4px;
    top: -2px;
  }
}
</style>
