<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { View, Delete } from '@element-plus/icons-vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import {
  getAdminWantBuyList,
  adminDeleteWantBuy,
  type WantBuyListItem,
  type WantBuyStatus,
  WANT_BUY_STATUS_LABELS,
} from '@/api/modules/want-buy'
import { showError } from '@/utils/error'
import { formatDate } from '@/utils/format'
import { useRouter } from 'vue-router'

const router = useRouter()

// 数据
const wantBuys = ref<WantBuyListItem[]>([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)

// 筛选条件
const keyword = ref('')
const status = ref<WantBuyStatus | ''>('')

// 状态选项
const statusOptions = [
  { label: '全部', value: '' },
  { label: WANT_BUY_STATUS_LABELS.active, value: 'active' },
  { label: WANT_BUY_STATUS_LABELS.found, value: 'found' },
  { label: WANT_BUY_STATUS_LABELS.closed, value: 'closed' },
  { label: WANT_BUY_STATUS_LABELS.expired, value: 'expired' },
]

// 获取求购列表
async function fetchWantBuys() {
  loading.value = true
  try {
    const res = await getAdminWantBuyList({
      page: page.value,
      pageSize: pageSize.value,
      keyword: keyword.value || undefined,
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

// 搜索
function handleSearch() {
  page.value = 1
  fetchWantBuys()
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

// 查看详情
function viewDetail(id: number) {
  router.push({ name: 'WantBuyDetail', params: { id } })
}

// 删除
async function handleDelete(item: WantBuyListItem) {
  try {
    await ElMessageBox.confirm(
      `确定要删除求购贴「${item.name}」吗？`,
      '警告',
      { type: 'warning' }
    )
    const res = await adminDeleteWantBuy(item.id)
    if (res.data.code === 200) {
      ElMessage.success('删除成功')
      fetchWantBuys()
    }
  } catch (err) {
    if (err !== 'cancel') showError(err, '删除失败')
  }
}

// 获取状态标签类型
function getStatusTagType(s: WantBuyStatus) {
  const map: Record<WantBuyStatus, 'success' | 'primary' | 'info' | 'warning'> = {
    active: 'success',
    found: 'primary',
    closed: 'info',
    expired: 'warning',
  }
  return map[s]
}

onMounted(fetchWantBuys)
</script>

<template>
  <AdminLayout>
    <div class="admin-want-buys">
      <h1 class="page-title">求购管理</h1>

      <!-- 筛选栏 -->
      <div class="filter-bar">
        <el-input
          v-model="keyword"
          placeholder="搜索求购商品..."
          clearable
          style="width: 300px"
          @keyup.enter="handleSearch"
          @clear="handleSearch"
        >
          <template #append>
            <el-button @click="handleSearch">搜索</el-button>
          </template>
        </el-input>

        <el-select
          v-model="status"
          placeholder="全部状态"
          clearable
          style="width: 140px"
          @change="handleStatusChange"
        >
          <el-option
            v-for="opt in statusOptions"
            :key="opt.value || 'all'"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </div>

      <!-- 表格 -->
      <el-table :data="wantBuys" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="商品名称" min-width="150">
          <template #default="{ row }">
            <span class="name-cell" @click="viewDetail(row.id)">{{ row.name }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="user" label="发布者" width="120">
          <template #default="{ row }">
            <span>{{ row.user?.username || '匿名' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)" size="small">
              {{ WANT_BUY_STATUS_LABELS[row.status] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="viewCount" label="浏览" width="80" />
        <el-table-column prop="commentCount" label="评论" width="80" />
        <el-table-column prop="createdAt" label="发布时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="viewDetail(row.id)">
              <el-icon><View /></el-icon>
              查看
            </el-button>
            <el-button type="danger" link size="small" @click="handleDelete(row)">
              <el-icon><Delete /></el-icon>
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          :current-page="page"
          :page-size="pageSize"
          :total="total"
          layout="total, prev, pager, next"
          @current-change="handlePageChange"
        />
      </div>
    </div>
  </AdminLayout>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.admin-want-buys {
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
  gap: $spacing-md;
  margin-bottom: $spacing-lg;
}

.name-cell {
  color: $color-primary;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
}

.pagination-container {
  display: flex;
  justify-content: flex-end;
  margin-top: $spacing-lg;
}
</style>