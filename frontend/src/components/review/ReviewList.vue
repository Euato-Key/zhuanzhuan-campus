<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { getProductReviews, type ReviewItem, type ReviewSummary } from '@/api/modules/review'
import ReviewCard from './ReviewCard.vue'

const props = defineProps<{
  productId: string
}>()

const loading = ref(false)
const reviews = ref<ReviewItem[]>([])
const total = ref(0)
const summary = ref<ReviewSummary>({
  totalCount: 0,
  avgRating: 0,
  ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
})

const queryParams = reactive({
  page: 1,
  pageSize: 10,
  rating: undefined as number | undefined,
  hasImage: false,
  sortBy: 'time' as 'time' | 'rating',
  sortOrder: 'desc' as 'asc' | 'desc',
})

const ratingOptions = [
  { label: '全部', value: undefined },
  { label: '5星', value: 5 },
  { label: '4星', value: 4 },
  { label: '3星', value: 3 },
  { label: '2星', value: 2 },
  { label: '1星', value: 1 },
]

const maxRatingCount = computed(() => {
  const dist = summary.value.ratingDistribution
  return Math.max(...Object.values(dist), 1)
})

async function fetchReviews() {
  loading.value = true
  try {
    const res = await getProductReviews(props.productId, {
      rating: queryParams.rating,
      hasImage: queryParams.hasImage || undefined,
      sortBy: queryParams.sortBy,
      sortOrder: queryParams.sortOrder,
      page: queryParams.page,
      pageSize: queryParams.pageSize,
    })
    if (res.data.code === 200) {
      reviews.value = res.data.data.list
      total.value = res.data.data.total
      summary.value = res.data.data.summary
    }
  } catch (err) {
    console.error('获取评价列表失败', err)
  } finally {
    loading.value = false
  }
}

function handleRatingChange() {
  queryParams.page = 1
  fetchReviews()
}

function handleSortChange() {
  queryParams.page = 1
  fetchReviews()
}

function handlePageChange(page: number) {
  queryParams.page = page
  fetchReviews()
}

onMounted(() => {
  fetchReviews()
})
</script>

<template>
  <div class="review-list-section">
    <h2 class="section-title">买家评价</h2>

    <!-- 评价统计摘要 -->
    <div class="summary-card" v-if="summary.totalCount > 0">
      <div class="avg-rating">
        <span class="avg-number">{{ summary.avgRating }}</span>
        <el-rate :model-value="summary.avgRating" disabled allow-half />
        <span class="total-count">{{ summary.totalCount }} 条评价</span>
      </div>
      <div class="rating-bars">
        <div v-for="star in [5, 4, 3, 2, 1]" :key="star" class="rating-bar-row">
          <span class="star-label">{{ star }}星</span>
          <div class="bar-track">
            <div
              class="bar-fill"
              :style="{ width: `${(summary.ratingDistribution[star] / maxRatingCount) * 100}%` }"
            />
          </div>
          <span class="bar-count">{{ summary.ratingDistribution[star] }}</span>
        </div>
      </div>
    </div>

    <!-- 筛选栏 -->
    <div class="filter-bar" v-if="summary.totalCount > 0">
      <el-radio-group v-model="queryParams.rating" size="small" @change="handleRatingChange">
        <el-radio-button v-for="opt in ratingOptions" :key="String(opt.value)" :value="opt.value">
          {{ opt.label }}
        </el-radio-button>
      </el-radio-group>
      <el-checkbox v-model="queryParams.hasImage" @change="handleRatingChange" size="small">有图</el-checkbox>
      <el-select v-model="queryParams.sortBy" size="small" @change="handleSortChange" style="width: 100px">
        <el-option label="最新" value="time" />
        <el-option label="评分" value="rating" />
      </el-select>
    </div>

    <!-- 评价列表 -->
    <div class="review-list" v-loading="loading">
      <ReviewCard
        v-for="review in reviews"
        :key="review.id"
        :review="review"
      />
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
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.review-list-section {
  margin-top: $spacing-xl;
}

.section-title {
  font-size: $font-size-h2;
  font-weight: $font-weight-semibold;
  color: $color-text-primary;
  margin: 0 0 $spacing-lg;
}

.summary-card {
  display: flex;
  gap: $spacing-xl;
  padding: $spacing-lg;
  background: $color-bg-card;
  border-radius: $radius-lg;
  box-shadow: $shadow-sm;
  margin-bottom: $spacing-lg;
}

.avg-rating {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $spacing-xs;
  flex-shrink: 0;
}

.avg-number {
  font-size: 36px;
  font-weight: $font-weight-bold;
  color: $color-primary;
  font-family: $font-family-mono;
}

.total-count {
  font-size: $font-size-small;
  color: $color-text-secondary;
}

.rating-bars {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
}

.rating-bar-row {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
}

.star-label {
  font-size: $font-size-small;
  color: $color-text-secondary;
  width: 30px;
  text-align: right;
}

.bar-track {
  flex: 1;
  height: 8px;
  background: $color-bg-page;
  border-radius: 4px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  background: $color-primary;
  border-radius: 4px;
  transition: width $transition-fast;
}

.bar-count {
  font-size: $font-size-small;
  color: $color-text-placeholder;
  width: 30px;
}

.filter-bar {
  display: flex;
  align-items: center;
  gap: $spacing-md;
  margin-bottom: $spacing-lg;
  flex-wrap: wrap;
}

.review-list {
  min-height: 200px;
}

.pagination-wrap {
  display: flex;
  justify-content: center;
  margin-top: $spacing-lg;
}

@media (max-width: $breakpoint-sm) {
  .summary-card {
    flex-direction: column;
    align-items: center;
  }
}
</style>