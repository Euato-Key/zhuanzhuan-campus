<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Edit, Bottom, Top, Delete, Search, Goods } from '@element-plus/icons-vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import PublishProductDialog from '@/components/product/PublishProductDialog.vue'
import {
  getMyProducts,
  getProductById,
  offlineProduct as offlineProductApi,
  relistProduct as relistProductApi,
  deleteProduct as deleteProductApi,
  type MyProductItem,
  type ProductDetail,
  PRODUCT_STATUS_LABELS,
  PRODUCT_STATUS_TAG_TYPE,
  type ProductStatus,
} from '@/api/product'
import { getOssUrl } from '@/utils/oss'
import { showError, showSuccess } from '@/utils/error'

const router = useRouter()

// 列表
const loading = ref(false)
const products = ref<MyProductItem[]>([])
const total = ref(0)

// 查询
const queryParams = reactive({
  page: 1,
  pageSize: 10,
  keyword: '',
  status: '' as ProductStatus | '',
})

// 发布/编辑弹窗
const publishDialogVisible = ref(false)
const editingProduct = ref<ProductDetail | undefined>(undefined)

// 状态统计
const statusCounts = reactive<Record<string, number>>({
  all: 0,
  pending: 0,
  active: 0,
  offline: 0,
  audit_failed: 0,
  banned: 0,
})

const statusTabs = computed(() => [
  { key: '' as const, label: '全部', count: statusCounts.all },
  { key: 'pending' as const, label: '待审核', count: statusCounts.pending },
  { key: 'active' as const, label: '在售', count: statusCounts.active },
  { key: 'offline' as const, label: '已下架', count: statusCounts.offline },
  { key: 'audit_failed' as const, label: '审核失败', count: statusCounts.audit_failed },
  { key: 'banned' as const, label: '已封禁', count: statusCounts.banned },
])

// 获取商品列表
async function fetchProducts() {
  loading.value = true
  try {
    const res = await getMyProducts({
      ...queryParams,
      status: queryParams.status || undefined,
    })
    if (res.data.code === 200) {
      products.value = res.data.data.list
      total.value = res.data.data.total
      // 从分页数据推算各状态数量（简单方案：用 total 作为当前筛选的计数）
      updateStatusCounts()
    }
  } catch (err) {
    showError(err, '获取商品列表失败')
  } finally {
    loading.value = false
  }
}

// 获取各状态数量
async function fetchStatusCounts() {
  const statuses: ProductStatus[] = ['pending', 'active', 'offline', 'audit_failed', 'banned']
  let allCount = 0
  const promises = statuses.map(async (status) => {
    try {
      const res = await getMyProducts({ status, pageSize: 1 })
      if (res.data.code === 200) {
        statusCounts[status] = res.data.data.total
        allCount += res.data.data.total
      }
    } catch { /* ignore */ }
  })
  await Promise.all(promises)
  statusCounts.all = allCount
}

function updateStatusCounts() {
  // 仅更新当前筛选的 total，完整统计由 fetchStatusCounts 负责
}

// 状态切换
function handleStatusChange(status: ProductStatus | '') {
  queryParams.status = status
  queryParams.page = 1
  fetchProducts()
}

// 搜索
function handleSearch() {
  queryParams.page = 1
  fetchProducts()
}

// 分页
function handlePageChange(page: number) {
  queryParams.page = page
  fetchProducts()
}

// 发布新商品
function handlePublish() {
  editingProduct.value = undefined
  publishDialogVisible.value = true
}

// 编辑商品
async function editProduct(product: MyProductItem) {
  try {
    const res = await getProductById(product.id)
    if (res.data.code === 200) {
      editingProduct.value = res.data.data
      publishDialogVisible.value = true
    }
  } catch (err) {
    showError(err, '获取商品详情失败')
  }
}

// 下架
async function offlineProduct(product: MyProductItem) {
  try {
    await ElMessageBox.confirm('确定要下架该商品吗？', '提示', { type: 'warning' })
    const res = await offlineProductApi(product.id)
    if (res.data.code === 200) {
      showSuccess('商品已下架')
      fetchProducts()
      fetchStatusCounts()
    }
  } catch (err) {
    if (err !== 'cancel') showError(err, '操作失败')
  }
}

// 重新上架
async function relistProduct(product: MyProductItem) {
  try {
    await ElMessageBox.confirm('确定要重新上架该商品吗？', '提示', { type: 'info' })
    const res = await relistProductApi(product.id)
    if (res.data.code === 200) {
      showSuccess('已重新提交审核')
      fetchProducts()
      fetchStatusCounts()
    }
  } catch (err) {
    if (err !== 'cancel') showError(err, '操作失败')
  }
}

// 删除
async function deleteProduct(product: MyProductItem) {
  try {
    await ElMessageBox.confirm('确定要删除该商品吗？删除后无法恢复', '警告', { type: 'warning' })
    const res = await deleteProductApi(product.id)
    if (res.data.code === 200) {
      showSuccess('商品已删除')
      fetchProducts()
      fetchStatusCounts()
    }
  } catch (err) {
    if (err !== 'cancel') showError(err, '操作失败')
  }
}

// 查看详情
function viewProduct(product: MyProductItem) {
  router.push({ name: 'ProductDetail', params: { id: product.id } })
}

// 发布/编辑成功回调
function handlePublishSuccess() {
  fetchProducts()
  fetchStatusCounts()
}

onMounted(() => {
  fetchProducts()
  fetchStatusCounts()
})
</script>

<template>
  <AppLayout>
    <div class="my-products-page">
      <!-- 页头 -->
      <div class="page-header">
        <div class="header-left">
          <div class="header-icon">
            <el-icon :size="28"><Goods /></el-icon>
          </div>
          <div class="header-text">
            <h2>我的商品</h2>
            <p>管理我发布的商品，随时上下架</p>
          </div>
        </div>
        <el-button type="primary" :icon="Plus" round @click="handlePublish">发布商品</el-button>
      </div>

      <!-- 状态统计卡片 -->
      <div class="status-tabs">
        <div
          v-for="tab in statusTabs"
          :key="tab.key"
          :class="['status-tab', { active: queryParams.status === tab.key }]"
          @click="handleStatusChange(tab.key)"
        >
          <span class="tab-label">{{ tab.label }}</span>
          <span class="tab-count">{{ tab.count }}</span>
        </div>
      </div>

      <!-- 搜索栏 -->
      <div class="search-bar">
        <el-input
          v-model="queryParams.keyword"
          placeholder="搜索商品名称"
          :prefix-icon="Search"
          clearable
          style="width: 280px"
          @keyup.enter="handleSearch"
          @clear="handleSearch"
        />
      </div>

      <!-- 商品列表 -->
      <div v-loading="loading" class="product-list">
        <template v-if="products.length">
          <div v-for="product in products" :key="product.id" class="product-card">
            <!-- 商品图片 -->
            <div class="card-image" @click="viewProduct(product)">
              <img :src="getOssUrl(product.images?.[0])" :alt="product.name" />
            </div>

            <!-- 商品信息 -->
            <div class="card-body" @click="viewProduct(product)">
              <h3 class="card-title">{{ product.name }}</h3>
              <div class="card-meta">
                <span class="card-price">¥{{ product.currentPrice }}</span>
                <el-tag
                  :type="PRODUCT_STATUS_TAG_TYPE[product.status as ProductStatus]"
                  size="small"
                >
                  {{ PRODUCT_STATUS_LABELS[product.status as ProductStatus] }}
                </el-tag>
              </div>
              <div v-if="product.rejectReason" class="reject-reason">
                原因：{{ product.rejectReason }}
              </div>
              <div class="card-time">{{ new Date(product.createdAt).toLocaleDateString() }}</div>
            </div>

            <!-- 操作按钮 -->
            <div class="card-actions">
              <el-button
                v-if="product.status === 'active'"
                type="warning"
                plain
                size="small"
                :icon="Bottom"
                @click.stop="offlineProduct(product)"
              >
                下架
              </el-button>
              <el-button
                v-if="product.status === 'offline' || product.status === 'audit_failed'"
                type="success"
                plain
                size="small"
                :icon="Top"
                @click.stop="relistProduct(product)"
              >
                重新上架
              </el-button>
              <el-button
                v-if="product.status === 'active' || product.status === 'offline'"
                type="primary"
                plain
                size="small"
                :icon="Edit"
                @click.stop="editProduct(product)"
              >
                编辑
              </el-button>
              <el-button
                v-if="product.status === 'offline' || product.status === 'audit_failed'"
                type="danger"
                plain
                size="small"
                :icon="Delete"
                @click.stop="deleteProduct(product)"
              >
                删除
              </el-button>
            </div>
          </div>
        </template>

        <!-- 空状态 -->
        <el-empty v-else description="暂无商品">
          <el-button type="primary" @click="handlePublish">发布商品</el-button>
        </el-empty>
      </div>

      <!-- 分页 -->
      <div v-if="total > queryParams.pageSize" class="pagination-wrap">
        <el-pagination
          background
          layout="total, prev, pager, next"
          :total="total"
          :page-size="queryParams.pageSize"
          :current-page="queryParams.page"
          @current-change="handlePageChange"
        />
      </div>

      <!-- 发布/编辑弹窗 -->
      <PublishProductDialog
        v-model="publishDialogVisible"
        :product="editingProduct"
        @success="handlePublishSuccess"
      />
    </div>
  </AppLayout>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.my-products-page {
  max-width: 960px;
  margin: 0 auto;
  padding: 24px 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 24px 28px;
  background: linear-gradient(135deg, rgba($color-primary, 0.08), rgba($color-primary, 0.02));
  border-radius: $radius-lg;
  border: 1px solid rgba($color-primary, 0.12);

  .header-left {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .header-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 52px;
    height: 52px;
    border-radius: $radius-md;
    background: $color-primary;
    color: #fff;
    flex-shrink: 0;
  }

  .header-text {
    h2 {
      margin: 0 0 2px;
      font-size: 20px;
      font-weight: 600;
      color: $color-text-primary;
    }

    p {
      margin: 0;
      font-size: 13px;
      color: $color-text-secondary;
    }
  }
}

// 状态统计标签
.status-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  overflow-x: auto;
}

.status-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 20px;
  border-radius: $radius-md;
  background: #fff;
  border: 1px solid $color-border;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 80px;

  &:hover {
    border-color: $color-primary;
  }

  &.active {
    background: rgba($color-primary, 0.08);
    border-color: $color-primary;
  }

  .tab-label {
    font-size: 13px;
    color: $color-text-secondary;
    margin-bottom: 4px;
  }

  .tab-count {
    font-size: 20px;
    font-weight: 600;
    color: $color-text-primary;
  }

  &.active .tab-label,
  &.active .tab-count {
    color: $color-primary;
  }
}

// 搜索栏
.search-bar {
  margin-bottom: 20px;
}

// 商品卡片列表
.product-list {
  min-height: 200px;
}

.product-card {
  display: flex;
  gap: 16px;
  padding: 16px;
  background: #fff;
  border-radius: $radius-lg;
  border: 1px solid $color-border;
  margin-bottom: 12px;
  transition: box-shadow 0.2s;

  &:hover {
    box-shadow: $shadow-md;
  }
}

.card-image {
  width: 120px;
  height: 120px;
  border-radius: $radius-md;
  overflow: hidden;
  flex-shrink: 0;
  cursor: pointer;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.card-body {
  flex: 1;
  min-width: 0;
  cursor: pointer;
}

.card-title {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 500;
  color: $color-text-primary;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 6px;
}

.card-price {
  font-size: 18px;
  font-weight: 600;
  color: $color-error;
}

.reject-reason {
  font-size: 12px;
  color: $color-error;
  margin-bottom: 4px;
}

.card-time {
  font-size: 12px;
  color: $color-text-placeholder;
}

.card-actions {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
  flex-shrink: 0;
}

.pagination-wrap {
  display: flex;
  justify-content: center;
  margin-top: 24px;
}
</style>