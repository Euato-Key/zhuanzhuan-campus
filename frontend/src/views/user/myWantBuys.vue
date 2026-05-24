<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import AppLayout from '@/components/layout/AppLayout.vue'
import WantBuyCard from '@/components/want-buy/WantBuyCard.vue'
import PublishWantBuyDialog from '@/components/want-buy/PublishWantBuyDialog.vue'
import {
  getMyWantBuyList,
  deleteWantBuy,
  type WantBuyListItem,
  type WantBuyStatus,
  WANT_BUY_STATUS_LABELS,
} from '@/api/modules/want-buy'
import { showError } from '@/utils/error'

const router = useRouter()

// 数据
const wantBuys = ref<WantBuyListItem[]>([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const pageSize = ref(12)

// 状态筛选
const status = ref<WantBuyStatus | ''>('')

// 编辑弹窗
const publishDialogVisible = ref(false)
const editId = ref<number | undefined>(undefined)

// 状态选项
const statusOptions: { label: string; value: WantBuyStatus | '' }[] = [
  { label: '全部', value: '' },
  { label: WANT_BUY_STATUS_LABELS.active, value: 'active' },
  { label: WANT_BUY_STATUS_LABELS.found, value: 'found' },
  { label: WANT_BUY_STATUS_LABELS.closed, value: 'closed' },
  { label: WANT_BUY_STATUS_LABELS.expired, value: 'expired' },
]

// 获取我的求购列表
async function fetchWantBuys() {
  loading.value = true
  try {
    const res = await getMyWantBuyList({
      page: page.value,
      pageSize: pageSize.value,
      status: status.value || undefined,
    })
    if (res.data.code === 200) {
      wantBuys.value = res.data.data.list
      total.value = res.data.data.total
    }
  } catch (err) {
    showError(err, '获取求购列表失败')
  } finally {
    loading.value = false
  }
}

// 状态变化
function handleStatusChange() {
  page.value = 1
  fetchWantBuys()
}

// 分页变化
function handlePageChange(newPage: number) {
  page.value = newPage
  fetchWantBuys()
}

// 发布求购
function handlePublish() {
  editId.value = undefined
  publishDialogVisible.value = true
}

// 点击卡片
function handleCardClick(id: number) {
  router.push({ name: 'WantBuyDetail', params: { id } })
}

// 编辑
function handleEdit(id: number) {
  editId.value = id
  publishDialogVisible.value = true
}

// 删除
async function handleDelete(id: number) {
  try {
    await ElMessageBox.confirm('确定要删除这条求购吗？', '提示', { type: 'warning' })
    const res = await deleteWantBuy(id)
    if (res.data.code === 200) {
      ElMessage.success('删除成功')
      fetchWantBuys()
    }
  } catch (err) {
    if (err !== 'cancel') showError(err, '删除失败')
  }
}

// 发布成功
function handlePublishSuccess() {
  fetchWantBuys()
}

// 监听状态变化
watch(status, handleStatusChange)

onMounted(fetchWantBuys)
</script>

<template>
  <AppLayout>
    <!-- 页面头部 -->
    <section class="page-header">
      <div class="header-content">
        <h1 class="page-title">我的求购</h1>
        <p class="page-desc">管理你发布的求购信息</p>
      </div>
      <div class="header-actions">
        <el-button type="primary" size="large" @click="handlePublish">
          发布求购
        </el-button>
      </div>
    </section>

    <!-- 状态筛选 -->
    <section class="filter-bar">
      <div class="status-tabs">
        <span
          v-for="opt in statusOptions"
          :key="opt.value || 'all'"
          class="tab-item"
          :class="{ active: status === opt.value }"
          @click="status = opt.value"
        >
          {{ opt.label }}
        </span>
      </div>
    </section>

    <!-- 求购列表 -->
    <section class="want-buy-list" v-loading="loading">
      <div class="grid-container">
        <WantBuyCard
          v-for="item in wantBuys"
          :key="item.id"
          :want-buy="item"
          show-actions
          @click="handleCardClick"
          @edit="handleEdit"
          @delete="handleDelete"
        />
      </div>

      <el-empty v-if="!loading && wantBuys.length === 0" description="暂无求购信息">
        <el-button type="primary" @click="handlePublish">发布求购</el-button>
      </el-empty>

      <!-- 分页 -->
      <div v-if="total > pageSize" class="pagination-container">
        <el-pagination
          :current-page="page"
          :page-size="pageSize"
          :total="total"
          layout="prev, pager, next"
          @current-change="handlePageChange"
        />
      </div>
    </section>

    <!-- 发布弹窗 -->
    <PublishWantBuyDialog
      v-model="publishDialogVisible"
      :want-buy="editId ? wantBuys.find((w) => w.id === editId) : undefined"
      @success="handlePublishSuccess"
    />
  </AppLayout>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.page-header {
  background: linear-gradient(135deg, $color-primary-pale 0%, #fff 100%);
  border-radius: $radius-lg;
  padding: $spacing-xl $spacing-lg;
  margin-bottom: $spacing-lg;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: $spacing-lg;
}

.header-content {
  flex: 1;
  min-width: 200px;
}

.page-title {
  font-size: $font-size-h2;
  font-weight: $font-weight-bold;
  color: $color-text-primary;
  margin: 0 0 $spacing-sm;
}

.page-desc {
  font-size: $font-size-body;
  color: $color-text-secondary;
  margin: 0;
}

.header-actions {
  flex-shrink: 0;
}

.filter-bar {
  margin-bottom: $spacing-lg;
}

.status-tabs {
  display: flex;
  gap: $spacing-sm;
  flex-wrap: wrap;
}

.tab-item {
  padding: $spacing-sm $spacing-md;
  border-radius: $radius-md;
  font-size: $font-size-body;
  color: $color-text-secondary;
  cursor: pointer;
  transition: all $transition-fast;
  background: $color-bg-card;
  border: 1px solid $color-border;

  &:hover {
    color: $color-primary;
    border-color: $color-primary;
  }

  &.active {
    color: #fff;
    background: $color-primary;
    border-color: $color-primary;
  }
}

.want-buy-list {
  min-height: 200px;
}

.grid-container {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: $spacing-lg;

  @media (max-width: $breakpoint-lg) {
    grid-template-columns: repeat(3, 1fr);
  }

  @media (max-width: $breakpoint-md) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: $breakpoint-sm) {
    grid-template-columns: 1fr;
  }
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: $spacing-xl;
}
</style>