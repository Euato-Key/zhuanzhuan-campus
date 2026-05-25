<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, markRaw, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import { TrendCharts, User, Goods, Document, ChatDotRound, ShoppingCart, Money, Clock } from '@element-plus/icons-vue'
import api from '@/api'
import { getDashboardCharts, type ChartStatsData } from '@/api/modules/admin'
import { formatDate, formatRelativeTime } from '@/utils/format'
import * as echarts from 'echarts'

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
const chartLoading = ref(false)
const stats = ref([
  { label: '用户总数', value: '0', icon: markRaw(User), color: '#4CAF50', change: '', sub: '' },
  { label: '商品总数', value: '0', icon: markRaw(Goods), color: '#2196F3', change: '', sub: '' },
  { label: '订单总数', value: '0', icon: markRaw(Document), color: '#FF9800', change: '', sub: '' },
  { label: '待处理举报', value: '0', icon: markRaw(ChatDotRound), color: '#F44336', change: '', sub: '' },
])

const extraStats = ref([
  { label: '今日新增用户', value: '0', icon: markRaw(User), color: '#66BB6A' },
  { label: '待审核商品', value: '0', icon: markRaw(Clock), color: '#42A5F5' },
  { label: '待付款订单', value: '0', icon: markRaw(ShoppingCart), color: '#FFA726' },
  { label: '总交易额', value: '¥0', icon: markRaw(Money), color: '#EF5350' },
])

const recentActivities = ref<{ time: string; content: string; type: string }[]>([])
const pendingReviews = ref<{ id: number; name: string; seller: string; time: string }[]>([])

// Chart data
const chartData = ref<ChartStatsData | null>(null)
const userTrendChartRef = ref<HTMLElement>()
const orderTrendChartRef = ref<HTMLElement>()
const productStatusChartRef = ref<HTMLElement>()
const categoryChartRef = ref<HTMLElement>()
let userTrendChart: echarts.ECharts | null = null
let orderTrendChart: echarts.ECharts | null = null
let productStatusChart: echarts.ECharts | null = null
let categoryChart: echarts.ECharts | null = null

onMounted(async () => {
  loading.value = true
  try {
    const res = await api.get('/admin/dashboard')
    const data: DashboardStats = res.data.data

    stats.value = [
      { label: '用户总数', value: String(data.totalUsers), icon: markRaw(User), color: '#4CAF50', change: data.newUsersToday > 0 ? `+${data.newUsersToday}` : '', sub: `今日新增 ${data.newUsersToday}` },
      { label: '商品总数', value: String(data.totalProducts), icon: markRaw(Goods), color: '#2196F3', change: data.pendingReviewProducts > 0 ? `${data.pendingReviewProducts} 待审` : '', sub: `待审核 ${data.pendingReviewProducts}` },
      { label: '订单总数', value: String(data.totalOrders), icon: markRaw(Document), color: '#FF9800', change: data.pendingPaymentOrders > 0 ? `${data.pendingPaymentOrders} 待付` : '', sub: `待付款 ${data.pendingPaymentOrders}` },
      { label: '待处理举报', value: String(data.recentActivities.length), icon: markRaw(ChatDotRound), color: '#F44336', change: '', sub: '待处理举报' },
    ]

    extraStats.value = [
      { label: '今日新增用户', value: String(data.newUsersToday), icon: markRaw(User), color: '#66BB6A' },
      { label: '待审核商品', value: String(data.pendingReviewProducts), icon: markRaw(Clock), color: '#42A5F5' },
      { label: '待付款订单', value: String(data.pendingPaymentOrders), icon: markRaw(ShoppingCart), color: '#FFA726' },
      { label: '总交易额', value: `¥${data.totalRevenue.toLocaleString()}`, icon: markRaw(Money), color: '#EF5350' },
    ]

    recentActivities.value = data.recentActivities.map((a) => ({
      time: formatDate(a.time, 'time'),
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

  // Load chart data
  chartLoading.value = true
  try {
    const chartRes = await getDashboardCharts()
    if (chartRes.data.code === 200) {
      chartData.value = chartRes.data.data
      await nextTick()
      renderCharts()
    }
  } catch (err) {
    console.error('Failed to load chart stats:', err)
  } finally {
    chartLoading.value = false
  }

  window.addEventListener('resize', handleResize)
})

function renderCharts() {
  if (!chartData.value) return

  // 1. User registration trend
  if (userTrendChartRef.value) {
    userTrendChart = echarts.init(userTrendChartRef.value)
    userTrendChart.setOption({
      tooltip: { trigger: 'axis' },
      grid: { top: 30, right: 20, bottom: 30, left: 45 },
      xAxis: {
        type: 'category',
        data: chartData.value.userTrend.dates,
        axisLine: { lineStyle: { color: '#ddd' } },
        axisLabel: { color: '#666' },
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        axisLine: { show: false },
        splitLine: { lineStyle: { color: '#f0f0f0' } },
        axisLabel: { color: '#666' },
      },
      series: [{
        name: '新增用户',
        type: 'line',
        data: chartData.value.userTrend.values,
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: { width: 3, color: '#4CAF50' },
        itemStyle: { color: '#4CAF50' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(76,175,80,0.3)' },
            { offset: 1, color: 'rgba(76,175,80,0.02)' },
          ]),
        },
      }],
    })
  }

  // 2. Order & revenue trend
  if (orderTrendChartRef.value) {
    orderTrendChart = echarts.init(orderTrendChartRef.value)
    orderTrendChart.setOption({
      tooltip: { trigger: 'axis' },
      legend: { data: ['订单数', '交易额'], top: 0, textStyle: { color: '#666' } },
      grid: { top: 40, right: 55, bottom: 30, left: 45 },
      xAxis: {
        type: 'category',
        data: chartData.value.orderTrend.dates,
        axisLine: { lineStyle: { color: '#ddd' } },
        axisLabel: { color: '#666' },
      },
      yAxis: [
        {
          type: 'value',
          name: '订单数',
          minInterval: 1,
          axisLine: { show: false },
          splitLine: { lineStyle: { color: '#f0f0f0' } },
          axisLabel: { color: '#666' },
        },
        {
          type: 'value',
          name: '交易额(¥)',
          axisLine: { show: false },
          splitLine: { show: false },
          axisLabel: { color: '#666' },
        },
      ],
      series: [
        {
          name: '订单数',
          type: 'bar',
          data: chartData.value.orderTrend.counts,
          itemStyle: { color: '#42A5F5', borderRadius: [4, 4, 0, 0] },
          barWidth: '35%',
        },
        {
          name: '交易额',
          type: 'line',
          yAxisIndex: 1,
          data: chartData.value.orderTrend.revenues,
          smooth: true,
          symbol: 'circle',
          symbolSize: 8,
          lineStyle: { width: 3, color: '#FF9800' },
          itemStyle: { color: '#FF9800' },
        },
      ],
    })
  }

  // 3. Product status distribution
  if (productStatusChartRef.value) {
    productStatusChart = echarts.init(productStatusChartRef.value)
    const statusColors: Record<string, string> = {
      '在售': '#4CAF50',
      '待审核': '#FF9800',
      '已下架': '#9E9E9E',
      '已封禁': '#F44336',
      '审核未通过': '#E91E63',
      '已过期': '#C0C4CC',
    }
    productStatusChart.setOption({
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: { orient: 'vertical', right: 10, top: 'center', textStyle: { color: '#666' } },
      series: [{
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['35%', '50%'],
        avoidLabelOverlap: false,
        label: { show: false },
        emphasis: { label: { show: true, fontWeight: 'bold' } },
        data: chartData.value.productStatus.map((item) => ({
          ...item,
          itemStyle: { color: statusColors[item.name] },
        })),
      }],
    })
  }

  // 4. Category distribution
  if (categoryChartRef.value) {
    categoryChart = echarts.init(categoryChartRef.value)
    categoryChart.setOption({
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: { orient: 'vertical', right: 10, top: 'center', textStyle: { color: '#666' } },
      series: [{
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['35%', '50%'],
        avoidLabelOverlap: false,
        label: { show: false },
        emphasis: { label: { show: true, fontWeight: 'bold' } },
        data: chartData.value.categoryDistribution,
        color: ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336', '#00BCD4', '#795548', '#607D8B'],
      }],
    })
  }
}

// Resize charts on window resize
function handleResize() {
  userTrendChart?.resize()
  orderTrendChart?.resize()
  productStatusChart?.resize()
  categoryChart?.resize()
}

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  userTrendChart?.dispose()
  orderTrendChart?.dispose()
  productStatusChart?.dispose()
  categoryChart?.dispose()
})

function viewAllReviews() {
  router.push('/admin/products?status=pending')
}

function viewAllReports() {
  router.push('/admin/reports')
}

function reviewProduct(id: number) {
  router.push(`/admin/products?highlight=${id}`)
}
</script>

<template>
  <AdminLayout>
    <!-- Stats Cards -->
    <div class="stats-grid" v-loading="loading">
      <div v-for="stat in stats" :key="stat.label" class="stat-card">
        <div class="stat-icon" :style="{ background: stat.color + '20', color: stat.color }">
          <el-icon :size="24"><component :is="stat.icon" /></el-icon>
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ stat.value }}</span>
          <span class="stat-label">{{ stat.label }}</span>
          <span v-if="stat.sub" class="stat-sub">{{ stat.sub }}</span>
        </div>
        <span v-if="stat.change" class="stat-change" :class="{ positive: stat.change.startsWith('+') }">
          {{ stat.change }}
        </span>
      </div>
    </div>

    <!-- Extra Stats -->
    <div class="extra-stats" v-loading="loading">
      <div v-for="item in extraStats" :key="item.label" class="extra-stat-item">
        <div class="extra-stat-icon" :style="{ color: item.color }">
          <el-icon :size="18"><component :is="item.icon" /></el-icon>
        </div>
        <span class="extra-stat-value">{{ item.value }}</span>
        <span class="extra-stat-label">{{ item.label }}</span>
      </div>
    </div>

    <!-- Charts Grid -->
    <div class="charts-grid" v-loading="chartLoading">
      <div class="card chart-card">
        <div class="card-header">
          <h3>
            <el-icon><User /></el-icon>
            用户注册趋势
          </h3>
          <span class="chart-subtitle">近7天</span>
        </div>
        <div ref="userTrendChartRef" class="chart-container" />
      </div>

      <div class="card chart-card">
        <div class="card-header">
          <h3>
            <el-icon><Document /></el-icon>
            订单与交易额趋势
          </h3>
          <span class="chart-subtitle">近7天</span>
        </div>
        <div ref="orderTrendChartRef" class="chart-container" />
      </div>

      <div class="card chart-card">
        <div class="card-header">
          <h3>
            <el-icon><Goods /></el-icon>
            商品状态分布
          </h3>
        </div>
        <div ref="productStatusChartRef" class="chart-container" />
      </div>

      <div class="card chart-card">
        <div class="card-header">
          <h3>
            <el-icon><Goods /></el-icon>
            商品分类分布
          </h3>
        </div>
        <div ref="categoryChartRef" class="chart-container" />
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
          <el-button type="primary" text size="small" @click="viewAllReports">查看全部</el-button>
        </div>
        <div v-if="recentActivities.length > 0" class="activity-list">
          <div v-for="(activity, index) in recentActivities" :key="index" class="activity-item">
            <span class="activity-time">{{ activity.time }}</span>
            <span class="activity-content">{{ activity.content }}</span>
          </div>
        </div>
        <el-empty v-else description="暂无最近动态" :image-size="60" />
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
        <div v-if="pendingReviews.length > 0" class="review-list">
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
        <el-empty v-else description="暂无待审核商品" :image-size="60" />
      </div>
    </div>
  </AdminLayout>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 20px;
}

.stat-card {
  background: #fff;
  border-radius: $radius-lg;
  padding: 20px 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: $shadow-sm;
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: $shadow-md;
  }
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: $radius-md;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.stat-value {
  font-size: 26px;
  font-weight: 700;
  color: $color-text-primary;
  line-height: 1.2;
}

.stat-label {
  font-size: 13px;
  color: $color-text-secondary;
}

.stat-sub {
  font-size: 12px;
  color: $color-text-placeholder;
}

.stat-change {
  font-size: 13px;
  font-weight: 500;
  color: #F44336;
  flex-shrink: 0;

  &.positive { color: #4CAF50; }
}

.extra-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 24px;
}

.extra-stat-item {
  background: #fff;
  border-radius: $radius-lg;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  box-shadow: $shadow-sm;
}

.extra-stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.extra-stat-value {
  font-size: 18px;
  font-weight: 600;
  color: $color-text-primary;
}

.extra-stat-label {
  font-size: 13px;
  color: $color-text-secondary;
}

.charts-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 24px;
}

.chart-card {
  .card-header {
    margin-bottom: 12px;
    padding-bottom: 12px;
  }
}

.chart-subtitle {
  font-size: 12px;
  color: $color-text-placeholder;
}

.chart-container {
  width: 100%;
  height: 280px;
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
  gap: 0;
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
  gap: 0;
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
  min-width: 0;
}

.review-name {
  font-size: 14px;
  font-weight: 500;
  color: $color-text-primary;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.review-meta {
  font-size: 13px;
  color: $color-text-secondary;
}

@media (max-width: 1200px) {
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
  .extra-stats { grid-template-columns: repeat(2, 1fr); }
  .charts-grid { grid-template-columns: 1fr; }
}

@media (max-width: 768px) {
  .stats-grid { grid-template-columns: 1fr; }
  .extra-stats { grid-template-columns: 1fr 1fr; }
  .content-grid { grid-template-columns: 1fr; }
  .charts-grid { grid-template-columns: 1fr; }
}
</style>
