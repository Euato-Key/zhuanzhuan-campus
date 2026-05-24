<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Comment } from '@element-plus/icons-vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import ReviewCard from '@/components/review/ReviewCard.vue'
import {
  getSentReviews,
  getReceivedReviews,
  deleteReview,
  deleteAppend,
  type ReviewItem,
  type ReviewStatus,
  type ReviewType,
} from '@/api/modules/review'
import { showError, showSuccess } from '@/utils/error'

const loading = ref(false)
const reviews = ref<ReviewItem[]>([])
const total = ref(0)
const activeTab = ref<'sent' | 'received'>('sent')

const queryParams = reactive({
  page: 1,
  pageSize: 10,
  // sent filters
  status: '' as ReviewStatus | '',
  // received filters
  type: '' as ReviewType | '',
  rating: '' as number | string,
})

const sentStatusOptions: { label: string; value: string }[] = [
  { label: '全部', value: '' },
  { label: '待审核', value: 'pending' },
  { label: '已通过', value: 'approved' },
  { label: '已拒绝', value: 'rejected' },
  { label: '已删除', value: 'deleted' },
]

const receivedTypeOptions: { label: string; value: string }[] = [
  { label: '全部', value: '' },
  { label: '买家评卖家', value: 'buyer_to_seller' },
  { label: '卖家评买家', value: 'seller_to_buyer' },
]

const ratingOptions: { label: string; value: number | string }[] = [
  { label: '全部', value: '' },
  { label: '5星', value: 5 },
  { label: '4星', value: 4 },
  { label: '3星', value: 3 },
  { label: '2星', value: 2 },
  { label: '1星', value: 1 },
]

async function fetchReviews() {
  loading.value = true
  try {
    if (activeTab.value === 'sent') {
      const res = await getSentReviews({
        status: queryParams.status || undefined,
        page: queryParams.page,
        pageSize: queryParams.pageSize,
      })
      if (res.data.code === 200) {
        reviews.value = res.data.data.list
        total.value = res.data.data.total
      }
    } else {
      const res = await getReceivedReviews({
        type: queryParams.type || undefined,
        rating: queryParams.rating ? Number(queryParams.rating) : undefined,
        page: queryParams.page,
        pageSize: queryParams.pageSize,
      })
      if (res.data.code === 200) {
        reviews.value = res.data.data.list
        total.value = res.data.data.total
      }
    }
  } catch (err) {
    showError(err, '获取评价列表失败')
  } finally {
    loading.value = false
  }
}

function handleTabChange(tab: 'sent' | 'received') {
  activeTab.value = tab
  queryParams.page = 1
  queryParams.status = ''
  queryParams.type = ''
  queryParams.rating = ''
  fetchReviews()
}

function handleFilterChange() {
  queryParams.page = 1
  fetchReviews()
}

function handlePageChange(page: number) {
  queryParams.page = page
  fetchReviews()
}

async function handleDeleteReview(reviewId: number) {
  try {
    await ElMessageBox.confirm('确定要删除该评价吗？删除后不可恢复', '提示', { type: 'warning' })
    const res = await deleteReview(reviewId)
    if (res.data.code === 200) {
      showSuccess('评价已删除')
      fetchReviews()
    } else {
      ElMessage.error(res.data.message || '删除失败')
    }
  } catch (err) {
    if (err !== 'cancel') showError(err, '删除失败')
  }
}

async function handleDeleteAppend(reviewId: number) {
  try {
    await ElMessageBox.confirm('确定要删除追评吗？', '提示', { type: 'warning' })
    const res = await deleteAppend(reviewId)
    if (res.data.code === 200) {
      showSuccess('追评已删除')
      fetchReviews()
    } else {
      ElMessage.error(res.data.message || '删除失败')
    }
  } catch (err) {
    if (err !== 'cancel') showError(err, '删除失败')
  }
}

onMounted(() => {
  fetchReviews()
})
</script>

<template>
  <AppLayout>
    <div class="reviews-page">
      <!-- 页头 -->
      <div class="page-header">
        <div class="header-left">
          <div class="header-icon">
            <el-icon :size="28"><Comment /></el-icon>
          </div>
          <div class="header-text">
            <h2>我的评价</h2>
            <p>查看我发出和收到的评价</p>
          </div>
        </div>
      </div>

      <!-- Tab 切换 -->
      <div class="role-tabs">
        <div
          class="role-tab"
          :class="{ active: activeTab === 'sent' }"
          @click="handleTabChange('sent')"
        >
          我发出的
        </div>
        <div
          class="role-tab"
          :class="{ active: activeTab === 'received' }"
          @click="handleTabChange('received')"
        >
          我收到的
        </div>
      </div>

      <!-- 筛选栏 -->
      <div v-if="activeTab === 'sent'" class="filter-bar">
        <el-radio-group v-model="queryParams.status" size="small" @change="handleFilterChange">
          <el-radio-button
            v-for="opt in sentStatusOptions"
            :key="String(opt.value)"
            :value="opt.value"
          >
            {{ opt.label }}
          </el-radio-button>
        </el-radio-group>
      </div>

      <div v-if="activeTab === 'received'" class="filter-bar">
        <el-radio-group v-model="queryParams.type" size="small" @change="handleFilterChange">
          <el-radio-button
            v-for="opt in receivedTypeOptions"
            :key="String(opt.value)"
            :value="opt.value"
          >
            {{ opt.label }}
          </el-radio-button>
        </el-radio-group>
        <el-select
          v-model="queryParams.rating"
          placeholder="星级筛选"
          size="small"
          style="width: 120px"
          @change="handleFilterChange"
        >
          <el-option
            v-for="opt in ratingOptions"
            :key="String(opt.value)"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </div>

      <!-- 评价列表 -->
      <div v-loading="loading" class="review-list">
        <template v-if="reviews.length">
          <ReviewCard
            v-for="review in reviews"
            :key="review.id"
            :review="review"
            :show-delete-btn="activeTab === 'sent'"
            :show-status="activeTab === 'sent'"
            @delete="handleDeleteReview"
            @delete-append="handleDeleteAppend"
          />
        </template>
        <el-empty v-if="!loading && reviews.length === 0" description="暂无评价" />
      </div>

      <!-- 分页 -->
      <div class="pagination-wrap" v-if="total > queryParams.pageSize">
        <el-pagination
          background
          layout="total, prev, pager, next"
          :total="total"
          :page-size="queryParams.pageSize"
          :current-page="queryParams.page"
          @current-change="handlePageChange"
        />
      </div>
    </div>
  </AppLayout>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.reviews-page {
  max-width: $container-lg;
  margin: 0 auto;
  padding: $spacing-lg;
}

.page-header {
  background: linear-gradient(135deg, $color-primary, $color-primary-dark);
  border-radius: $radius-lg;
  padding: $spacing-lg $spacing-xl;
  margin-bottom: $spacing-lg;
  color: #fff;
}

.header-left {
  display: flex;
  align-items: center;
  gap: $spacing-md;
}

.header-icon {
  width: 48px;
  height: 48px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: $radius-md;
  display: flex;
  align-items: center;
  justify-content: center;
}

.header-text {
  h2 {
    margin: 0;
    font-size: $font-size-h3;
    font-weight: $font-weight-bold;
  }

  p {
    margin: 4px 0 0;
    font-size: $font-size-small;
    opacity: 0.85;
  }
}

.role-tabs {
  display: flex;
  gap: 0;
  margin-bottom: $spacing-lg;
  border-bottom: 2px solid $color-border-light;

  .role-tab {
    padding: $spacing-sm $spacing-lg;
    font-size: $font-size-body;
    font-weight: $font-weight-medium;
    color: $color-text-secondary;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    margin-bottom: -2px;
    transition: all $transition-fast;

    &:hover {
      color: $color-primary;
    }

    &.active {
      color: $color-primary;
      border-bottom-color: $color-primary;
    }
  }
}

.filter-bar {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  margin-bottom: $spacing-lg;
  flex-wrap: wrap;
}

.review-list {
  min-height: 300px;
}

.pagination-wrap {
  display: flex;
  justify-content: center;
  margin-top: $spacing-xl;
}
</style>