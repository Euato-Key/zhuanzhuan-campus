<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import {
  getAdminReviews,
  adminApproveReview,
  adminRejectReview,
  REVIEW_TYPE_LABELS,
  REVIEW_STATUS_LABELS,
  REVIEW_STATUS_TAG_TYPE,
  type ReviewItem,
  type ReviewStatus,
  type ReviewType,
} from '@/api/modules/review'
import { showError, showSuccess } from '@/utils/error'
import { formatDate } from '@/utils/format'
import { getOssUrl } from '@/utils/oss'

const loading = ref(false)
const reviews = ref<ReviewItem[]>([])
const total = ref(0)

const queryParams = reactive({
  page: 1,
  pageSize: 10,
  status: '' as ReviewStatus | '',
  type: '' as ReviewType | '',
  rating: undefined as number | undefined,
})

const statusOptions = [
  { label: '全部', value: '' },
  { label: '待审核', value: 'pending' },
  { label: '已通过', value: 'approved' },
  { label: '已拒绝', value: 'rejected' },
]

const typeOptions = [
  { label: '全部', value: '' },
  { label: '买家评卖家', value: 'buyer_to_seller' },
  { label: '卖家评买家', value: 'seller_to_buyer' },
]

async function fetchReviews() {
  loading.value = true
  try {
    const res = await getAdminReviews({
      status: queryParams.status || undefined,
      type: queryParams.type || undefined,
      rating: queryParams.rating || undefined,
      page: queryParams.page,
      pageSize: queryParams.pageSize,
    })
    if (res.data.code === 200) {
      reviews.value = res.data.data.list
      total.value = res.data.data.total
    }
  } catch (err) {
    showError(err, '获取评价列表失败')
  } finally {
    loading.value = false
  }
}

function handleFilterChange() {
  queryParams.page = 1
  fetchReviews()
}

function handlePageChange(page: number) {
  queryParams.page = page
  fetchReviews()
}

async function handleApprove(review: ReviewItem) {
  try {
    await ElMessageBox.confirm('确定通过该评价？', '审核通过', { type: 'success' })
    const res = await adminApproveReview(review.id)
    if (res.data.code === 200) {
      showSuccess('审核通过')
      fetchReviews()
    }
  } catch (err: any) {
    if (err !== 'cancel') showError(err, '操作失败')
  }
}

async function handleReject(review: ReviewItem) {
  try {
    const { value: reason } = await ElMessageBox.prompt('请输入拒绝原因', '审核拒绝', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputPlaceholder: '请输入拒绝原因',
      inputValidator: (val: string) => val?.trim() ? true : '拒绝原因不能为空',
    })
    const res = await adminRejectReview(review.id, { rejectReason: reason.trim() })
    if (res.data.code === 200) {
      showSuccess(res.data.data.message || '已拒绝')
      fetchReviews()
    }
  } catch (err: any) {
    if (err !== 'cancel') showError(err, '操作失败')
  }
}
</script>

<template>
  <AdminLayout>
    <div class="admin-reviews-page">
      <h1 class="page-title">评价管理</h1>

      <!-- 筛选栏 -->
      <div class="filter-bar">
        <el-select v-model="queryParams.status" placeholder="状态筛选" size="default" @change="handleFilterChange" style="width: 140px">
          <el-option v-for="opt in statusOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
        </el-select>
        <el-select v-model="queryParams.type" placeholder="类型筛选" size="default" @change="handleFilterChange" style="width: 140px">
          <el-option v-for="opt in typeOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
        </el-select>
      </div>

      <!-- 评价列表 -->
      <el-table :data="reviews" v-loading="loading" stripe>
        <el-table-column label="ID" prop="id" width="70" />
        <el-table-column label="评价人" width="120">
          <template #default="{ row }">
            <div class="user-cell">
              <el-avatar :size="28" :src="row.reviewer?.avatar ? getOssUrl(row.reviewer.avatar) : undefined">
                {{ row.reviewer?.username?.charAt(0) || '?' }}
              </el-avatar>
              <span>{{ row.reviewer?.username || '-' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="类型" width="110">
          <template #default="{ row }">
            <el-tag size="small" effect="plain">{{ REVIEW_TYPE_LABELS[(row as ReviewItem).type] || row.type }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="评分" width="80">
          <template #default="{ row }">
            <el-rate :model-value="row.rating" disabled size="small" />
          </template>
        </el-table-column>
        <el-table-column label="评价内容" min-width="200">
          <template #default="{ row }">
            <div class="content-cell">
              <p class="review-text">{{ row.content || '无文字评价' }}</p>
              <p v-if="row.isAppend && row.appendContent" class="append-text">
                <el-tag size="small" type="info" effect="plain">追评</el-tag>
                {{ row.appendContent }}
              </p>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="匿名" width="70">
          <template #default="{ row }">
            <el-tag v-if="row.isAnonymous" size="small" type="info">是</el-tag>
            <span v-else>否</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="REVIEW_STATUS_TAG_TYPE[(row as ReviewItem).status]" size="small">
              {{ REVIEW_STATUS_LABELS[(row as ReviewItem).status] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.createdAt, 'full') }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <template v-if="row.status === 'pending'">
              <el-button size="small" type="success" plain @click="handleApprove(row)">通过</el-button>
              <el-button size="small" type="danger" plain @click="handleReject(row)">拒绝</el-button>
            </template>
            <span v-else class="text-muted">已处理</span>
          </template>
        </el-table-column>
      </el-table>

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
  </AdminLayout>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.admin-reviews-page {
  padding: $spacing-lg;
}

.page-title {
  font-size: $font-size-h2;
  font-weight: $font-weight-semibold;
  color: $color-text-primary;
  margin: 0 0 $spacing-lg;
}

.filter-bar {
  display: flex;
  gap: $spacing-sm;
  margin-bottom: $spacing-lg;
}

.user-cell {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  font-size: $font-size-small;
}

.content-cell {
  .review-text {
    margin: 0;
    font-size: $font-size-body;
    color: $color-text-primary;
  }

  .append-text {
    margin: $spacing-xs 0 0;
    font-size: $font-size-small;
    color: $color-text-secondary;
    display: flex;
    align-items: flex-start;
    gap: $spacing-xs;
  }
}

.text-muted {
  color: $color-text-placeholder;
  font-size: $font-size-small;
}

.pagination-wrap {
  display: flex;
  justify-content: center;
  margin-top: $spacing-lg;
}
</style>