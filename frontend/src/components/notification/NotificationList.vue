<template>
  <div class="notification-list">
    <div v-if="store.loading && store.notifications.length === 0" class="loading-state">
      <el-skeleton :rows="5" animated />
    </div>

    <template v-else-if="store.notifications.length > 0">
      <NotificationItem
        v-for="item in store.notifications"
        :key="item.id"
        :notification="item"
        @read="handleRead"
        @delete="handleDelete"
      />

      <div v-if="store.total > store.pageSize" class="pagination-wrap">
        <el-pagination
          v-model:current-page="currentPage"
          :page-size="store.pageSize"
          :total="store.total"
          layout="prev, pager, next"
          small
          @current-change="handlePageChange"
        />
      </div>
    </template>

    <el-empty v-else description="暂无通知" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ElMessageBox } from 'element-plus'
import NotificationItem from './NotificationItem.vue'
import { useNotificationStore } from '@/stores/notification'

const store = useNotificationStore()

const currentPage = computed({
  get: () => store.page,
  set: () => {},
})

function handlePageChange(page: number) {
  store.page = page
  store.fetchNotifications()
}

function handleRead(id: number) {
  store.markAsRead(id)
}

async function handleDelete(id: number) {
  try {
    await ElMessageBox.confirm('确定删除该通知吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
    store.deleteNotification(id)
  } catch {
    // 用户取消
  }
}
</script>

<style scoped lang="scss">
.notification-list {
  min-height: 200px;
}

.loading-state {
  padding: 20px;
}

.pagination-wrap {
  display: flex;
  justify-content: center;
  padding: 16px 0;
}
</style>
