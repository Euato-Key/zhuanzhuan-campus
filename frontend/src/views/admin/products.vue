<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { Search, Check, Close, View, Lock, Unlock, Bottom } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import ProductAuditDialog from '@/components/admin/ProductAuditDialog.vue'
import {
  getAdminProductList,
  unbanProduct,
  type MyProductItem,
  PRODUCT_STATUS_LABELS,
  type ProductStatus,
} from '@/api/product'

// 状态
const loading = ref(false)
const products = ref<MyProductItem[]>([])
const total = ref(0)

// 查询参数
const queryParams = reactive({
  page: 1,
  pageSize: 10,
  keyword: '',
  status: '' as ProductStatus | '',
  sellerId: undefined as number | undefined,
})

// 审核弹窗
const auditDialogVisible = ref(false)
const currentProduct = ref<MyProductItem | null>(null)

// 状态筛选选项
const statusOptions: { label: string; value: ProductStatus | '' }[] = [
  { label: '全部', value: '' },
  { label: '待审核', value: 'pending' },
  { label: '在售', value: 'active' },
  { label: '已下架', value: 'offline' },
  { label: '已封禁', value: 'banned' },
  { label: '审核失败', value: 'audit_failed' },
]

// 获取商品列表
async function fetchProducts() {
  loading.value = true
  try {
    const params = {
      ...queryParams,
      status: queryParams.status || undefined,
    }
    const res = await getAdminProductList(params)
    if (res.data.code === 200) {
      products.value = res.data.data.list
      total.value = res.data.data.total
    }
  } catch (err) {
    console.error('获取商品列表失败', err)
    ElMessage.error('获取商品列表失败')
  } finally {
    loading.value = false
  }
}

// 搜索
function handleSearch() {
  queryParams.page = 1
  fetchProducts()
}

// 状态筛选变化
function handleStatusChange() {
  queryParams.page = 1
  fetchProducts()
}

// 分页变化
function handlePageChange(page: number) {
  queryParams.page = page
  fetchProducts()
}

// 查看详情（弹窗）
function openAuditDialog(product: MyProductItem) {
  currentProduct.value = product
  auditDialogVisible.value = true
}

// 解封
async function handleUnban(product: MyProductItem) {
  try {
    await ElMessageBox.confirm('确定解封该商品吗？', '提示', { type: 'info' })
    const res = await unbanProduct(product.id)
    if (res.data.code === 200) {
      ElMessage.success('已解封')
      fetchProducts()
    }
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('操作失败')
    }
  }
}

// 弹窗操作成功
function handleAuditSuccess() {
  fetchProducts()
}

onMounted(() => {
  fetchProducts()
})
</script>

<template>
  <AdminLayout>
    <!-- Header -->
    <div class="page-header">
      <div class="header-actions">
        <el-input
          v-model="queryParams.keyword"
          placeholder="搜索商品名称"
          :prefix-icon="Search"
          clearable
          style="width: 300px"
          @keyup.enter="handleSearch"
          @clear="handleSearch"
        />
        <el-select
          v-model="queryParams.status"
          placeholder="状态筛选"
          clearable
          style="width: 120px"
          @change="handleStatusChange"
        >
          <el-option
            v-for="opt in statusOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
        <el-button type="primary" @click="handleSearch">搜索</el-button>
      </div>
    </div>

    <!-- Table -->
    <div class="card">
      <el-table :data="products" v-loading="loading" stripe table-layout="auto">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="商品名称" min-width="150">
          <template #default="{ row }">
            <div class="product-cell">
              <img :src="row.images[0] || '/placeholder.png'" class="product-thumb" />
              <span class="product-name-text">{{ row.name }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="user" label="卖家" width="120">
          <template #default="{ row }">
            <div class="seller-cell">
              <span>{{ row.user?.username }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="category" label="分类" width="100">
          <template #default="{ row }">
            {{ row.category?.name }}
          </template>
        </el-table-column>
        <el-table-column prop="currentPrice" label="价格" width="100">
          <template #default="{ row }">
            ¥{{ row.currentPrice }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag
              :type="
                row.status === 'active' ? 'success' :
                row.status === 'pending' ? 'warning' :
                row.status === 'banned' ? 'danger' : 'info'
              "
              size="small"
            >
              {{ PRODUCT_STATUS_LABELS[row.status] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="提交时间" width="150">
          <template #default="{ row }">
            {{ new Date(row.createdAt).toLocaleString() }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="openAuditDialog(row)">
              <el-icon><View /></el-icon>查看
            </el-button>
            <el-button
              v-if="row.status === 'pending'"
              type="success"
              link
              size="small"
              @click="openAuditDialog(row)"
            >
              <el-icon><Check /></el-icon>通过
            </el-button>
            <el-button
              v-if="row.status === 'pending'"
              type="danger"
              link
              size="small"
              @click="openAuditDialog(row)"
            >
              <el-icon><Close /></el-icon>拒绝
            </el-button>
            <el-button
              v-if="row.status === 'banned'"
              type="success"
              link
              size="small"
              @click="handleUnban(row)"
            >
              <el-icon><Unlock /></el-icon>解封
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrap">
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

    <!-- 审核弹窗 -->
    <ProductAuditDialog
      v-model="auditDialogVisible"
      :product="currentProduct"
      @success="handleAuditSuccess"
    />
  </AdminLayout>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.page-header {
  margin-bottom: 24px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.card {
  background: #fff;
  border-radius: $radius-lg;
  padding: 24px;
  box-shadow: $shadow-sm;
  overflow-x: auto;
}

.product-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.product-thumb {
  width: 40px;
  height: 40px;
  border-radius: $radius-sm;
  object-fit: cover;
}

.product-name-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.seller-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}
</style>