<script setup lang="ts">
import { ref, onMounted, markRaw } from 'vue'
import { useRouter } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import { TrendCharts, User, Goods, Document, ChatDotRound } from '@element-plus/icons-vue'
import api from '@/api'

const router = useRouter()

interface DashboardStats {
  totalUsers: number
  newUsersToday: number
  totalProducts: number
  pendingReviewProducts: number
  totalOrders: number
  pendingPaymentOrders: number
  totalRevenue: number
  recentActivities: { id: number; time: string; content: string; type: string }[]
  pendingProducts: { id: number; name: string; seller: string; time: string }[]
}

const loading = ref(false)
const stats = ref([
  { label: '用户总数', value: '0', icon: markRaw(User), color: '#4CAF50', change: '' },
  { label: '商品总数', value: '0', icon: markRaw(Goods), color: '#2196F3', change: '' },
  { label: '订单总数', value: '0', icon: markRaw(Document), color: '#FF9800', change: '' },
  { label: '待处理举报', value: '0', icon: markRaw(ChatDotRound), color: '#F44336', change: '' },
])

const recentActivities = ref<{ time: string; content: string; type: string }[]>([])

const pendingReviews = ref<{ id: number; name: string; seller: string; time: string }[]>([])

onMounted(async () => {
  loading.value = true
  try {
    const res = await api.get('/admin/dashboard')
    const data: DashboardStats = res.data.data

    stats.value = [
      { label: '用户总数', value: String(data.totalUsers), icon: markRaw(User), color: '#4CAF50', change: data.newUsersToday > 0 ? `+${data.newUsersToday}` : '' },
      { label: '商品总数', value: String(data.totalProducts), icon: markRaw(Goods), color: '#2196F3', change: data.pendingReviewProducts > 0 ? `${data.pendingReviewProducts} 待审` : '' },
      { label: '订单总数', value: String(data.totalOrders), icon: markRaw(Document), color: '#FF9800', change: data.pendingPaymentOrders > 0 ? `${data.pendingPaymentOrders} 待付` : '' },
      { label: '待处理举报', value: String(data.recentActivities.length), icon: markRaw(ChatDotRound), color: '#F44336', change: '' },
    ]

    recentActivities.value = data.recentActivities.map((a) => ({
      time: formatTime(a.time),
      content: a.content,
      type: a.type,
    }))

    pendingReviews.value = data.pendingProducts.map((p) => ({
      id: p.id,
      name: p.name,
      seller: p.seller,
      time: formatRelativeTime(p.time),
    }))
  } catch (err) {
    console.error('Failed to load dashboard stats:', err)
  } finally {
    loading.value = false
  }
})

function formatTime(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function formatRelativeTime(iso: string): string {
  const now = Date.now()
  const then = new Date(iso).getTime()
  const diff = Math.floor((now - then) / 1000 / 60)
  if (diff < 1) return '刚刚'
  if (diff < 60) return `${diff}分钟前`
  const hours = Math.floor(diff / 60)
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  return `${days}天前`
}

function viewAllReviews() {
  router.push('/admin/products?status=pending')
}

function reviewProduct(_id: number) {
  router.push('/admin/products')
}
</script>

<template>
  <AdminLayout>
    <!-- Stats Cards -->
    <div class="stats-grid">
      <div v-for="stat in stats" :key="stat.label" class="stat-card">
        <div class="stat-icon" :style="{ background: stat.color + '20', color: stat.color }">
          <el-icon :size="24"><component :is="stat.icon" /></el-icon>
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ stat.value }}</span>
          <span class="stat-label">{{ stat.label }}</span>
        </div>
        <span class="stat-change" :class="{ positive: stat.change.startsWith('+') }">
          {{ stat.change }}
        </span>
      </div>
    </div>

    <!-- Content Grid -->
    <div class="content-grid">
      <!-- Recent Activities -->
      <div class="card">
        <div class="card-header">
          <h3>
            <el-icon><TrendCharts /></el-icon>
            最近动态
          </h3>
        </div>
        <div class="activity-list">
          <div v-for="(activity, index) in recentActivities" :key="index" class="activity-item">
            <span class="activity-time">{{ activity.time }}</span>
            <span class="activity-content">{{ activity.content }}</span>
          </div>
        </div>
      </div>

      <!-- Pending Reviews -->
      <div class="card">
        <div class="card-header">
          <h3>
            <el-icon><Goods /></el-icon>
            待审核商品
          </h3>
          <el-button type="primary" text size="small" @click="viewAllReviews">查看全部</el-button>
        </div>
        <div class="review-list">
          <div v-for="item in pendingReviews" :key="item.id" class="review-item">
            <div class="review-info">
              <span class="review-name">{{ item.name }}</span>
              <span class="review-meta">卖家：{{ item.seller }} · {{ item.time }}</span>
            </div>
            <div class="review-actions">
              <el-button type="primary" size="small" @click="reviewProduct(item.id)">审核</el-button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
  margin-bottom: 24px;
}

.stat-card {
  background: #fff;
  border-radius: $radius-lg;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: $shadow-sm;
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: $radius-md;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: $color-text-primary;
}

.stat-label {
  font-size: 14px;
  color: $color-text-secondary;
}

.stat-change {
  font-size: 13px;
  font-weight: 500;
  color: #F44336;

  &.positive { color: #4CAF50; }
}

.content-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.card {
  background: #fff;
  border-radius: $radius-lg;
  padding: 24px;
  box-shadow: $shadow-sm;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid $color-border;

  h3 {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 16px;
    font-weight: 600;
    color: $color-text-primary;
    margin: 0;

    .el-icon { color: $color-primary; }
  }
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.activity-item {
  display: flex;
  gap: 16px;
  padding: 12px 0;
  border-bottom: 1px solid $color-border;

  &:last-child { border-bottom: none; }
}

.activity-time {
  font-size: 13px;
  color: $color-text-placeholder;
  min-width: 50px;
}

.activity-content {
  font-size: 14px;
  color: $color-text-primary;
}

.review-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.review-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid $color-border;

  &:last-child { border-bottom: none; }
}

.review-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.review-name {
  font-size: 14px;
  font-weight: 500;
  color: $color-text-primary;
}

.review-meta {
  font-size: 13px;
  color: $color-text-secondary;
}

@media (max-width: 1200px) {
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 768px) {
  .stats-grid { grid-template-columns: 1fr; }
  .content-grid { grid-template-columns: 1fr; }
}
</style>
