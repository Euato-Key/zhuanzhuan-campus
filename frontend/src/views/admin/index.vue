<script setup lang="ts">
import { ref } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import { TrendCharts, User, Goods, Document, ChatDotRound } from '@element-plus/icons-vue'

// Mock data for dashboard
const stats = ref([
  { label: '用户总数', value: '1,234', icon: User, color: '#4CAF50', change: '+12%' },
  { label: '商品总数', value: '5,678', icon: Goods, color: '#2196F3', change: '+8%' },
  { label: '订单总数', value: '890', icon: Document, color: '#FF9800', change: '+5%' },
  { label: '待处理举报', value: '23', icon: ChatDotRound, color: '#F44336', change: '-3%' },
])

const recentActivities = ref([
  { time: '10:30', content: '用户 张三 完成注册', type: 'user' },
  { time: '10:15', content: '商品 "二手自行车" 审核通过', type: 'product' },
  { time: '09:45', content: '订单 #12345 交易完成', type: 'order' },
  { time: '09:30', content: '用户 李四 提交举报', type: 'report' },
  { time: '09:00', content: '商品 "iPhone 13" 上架成功', type: 'product' },
])

const pendingReviews = ref([
  { id: 1, name: '二手自行车', seller: '张三', time: '10分钟前' },
  { id: 2, name: 'iPhone 13 Pro', seller: '李四', time: '30分钟前' },
  { id: 3, name: '教材高等数学', seller: '王五', time: '1小时前' },
])
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
          <el-button type="primary" text size="small">查看全部</el-button>
        </div>
        <div class="review-list">
          <div v-for="item in pendingReviews" :key="item.id" class="review-item">
            <div class="review-info">
              <span class="review-name">{{ item.name }}</span>
              <span class="review-meta">卖家：{{ item.seller }} · {{ item.time }}</span>
            </div>
            <div class="review-actions">
              <el-button type="primary" size="small">审核</el-button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<style scoped lang="scss">
@import '@/assets/styles/variables';

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
  border-bottom: 1px solid $color-border-light;

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
  border-bottom: 1px solid $color-border-light;

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
