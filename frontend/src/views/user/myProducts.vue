<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Edit, Delete, Top, Bottom } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getMyProducts,
  offlineProduct as offlineProductApi,
  relistProduct as relistProductApi,
  deleteProduct as deleteProductApi,
  type MyProductItem,
  PRODUCT_STATUS_LABELS,
  ITEM_CONDITION_LABELS,
  type ProductStatus,
} from '@/api/product'
import PublishProductDialog from '@/components/product/PublishProductDialog.vue'

const router = useRouter()

// 状态
const loading = ref(false)
const products = ref<MyProductItem[]>([])
const total = ref(0)

// 查询参数
const queryParams = reactive({
  page: 1,
  pageSize: 10,
  status: undefined as ProductStatus | undefined,
})

// 发布/编辑弹窗
const publishDialogVisible = ref(false)
const editingProduct = ref<MyProductItem | null>(null)

// 状态筛选选项
const statusOptions: { label: string; value: ProductStatus }[] = [
  { label: '全部', value: undefined as unknown as ProductStatus },
  { label: '待审核', value: 'pending' },
  { label: '在售', value: 'active' },
  { label: '已下架', value: 'offline' },
  { label: '审核失败', value: 'audit_failed' },
  { label: '已封禁', value: 'banned' },
]

// 获取商品列表
async function fetchProducts() {
  loading.value = true
  try {
    const res = await getMyProducts(queryParams)
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

// 查看详情
function goToDetail(product: MyProductItem) {
  router.push({ name: 'ProductDetail', params: { id: product.id } })
}

// 编辑商品
function editProduct(product: MyProductItem) {
  editingProduct.value = product
  publishDialogVisible.value = true
}

// 下架商品
async function handleOffline(product: MyProductItem) {
  try {
    await ElMessageBox.confirm('确定要下架该商品吗？', '提示', { type: 'warning' })
    const res = await offlineProductApi(product.id)
    if (res.data.code === 200) {
      ElMessage.success('商品已下架')
      fetchProducts()
    }
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('操作失败')
    }
  }
}

// 重新上架
async function handleRelist(product: MyProductItem) {
  try {
    await ElMessageBox.confirm('确定要重新上架该商品吗？', '提示', { type: 'info' })
    const res = await relistProductApi(product.id)
    if (res.data.code === 200) {
      ElMessage.success('已重新提交审核')
      fetchProducts()
    }
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('操作失败')
    }
  }
}

// 删除商品
async function handleDelete(product: MyProductItem) {
  try {
    await ElMessageBox.confirm('确定要删除该商品吗？删除后无法恢复', '警告', { type: 'warning' })
    const res = await deleteProductApi(product.id)
    if (res.data.code === 200) {
      ElMessage.success('商品已删除')
      fetchProducts()
    }
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('操作失败')
    }
  }
}

// 发布成功
function handlePublishSuccess() {
  editingProduct.value = null
  fetchProducts()
}

// 监听弹窗关闭
watch(publishDialogVisible, (val) => {
  if (!val) {
    editingProduct.value = null
  }
})

onMounted(() => {
  fetchProducts()
})
</script>

<template>
  <div class="my-products-page">
    <div class="page-header">
      <h1>我的商品</h1>
      <el-button type="primary" @click="publishDialogVisible = true">
        发布商品
      </el-button>
    </div>

    <!-- 筛选 -->
    <div class="filter-bar">
      <el-radio-group v-model="queryParams.status" @change="handleStatusChange">
        <el-radio-button
          v-for="opt in statusOptions"
          :key="opt.value"
          :value="opt.value"
        >
          {{ opt.label }}
        </el-radio-button>
      </el-radio-group>
    </div>

    <!-- 商品列表 -->
    <div class="product-list" v-loading="loading">
      <div v-for="product in products" :key="product.id" class="product-item">
        <div class="product-image" @click="goToDetail(product)">
          <img :src="product.images[0] || '/placeholder.png'" :alt="product.name" />
        </div>

        <div class="product-info" @click="goToDetail(product)">
          <h3 class="product-name">{{ product.name }}</h3>
          <div class="product-meta">
            <span class="price">¥{{ product.currentPrice }}</span>
            <el-tag
              :type="
                product.status === 'active' ? 'success' :
                product.status === 'pending' ? 'warning' :
                product.status === 'banned' ? 'danger' : 'info'
              "
              size="small"
            >
              {{ PRODUCT_STATUS_LABELS[product.status] }}
            </el-tag>
          </div>
          <div class="product-stats">
            <span>{{ product.viewCount }}浏览</span>
            <span>{{ product.favoriteCount }}收藏</span>
            <span>库存: {{ product.stock }}</span>
          </div>
          <div v-if="product.rejectReason" class="reject-reason">
            <el-text type="danger">拒绝原因: {{ product.rejectReason }}</el-text>
          </div>
        </div>

        <div class="product-actions">
          <el-button type="primary" link size="small" @click="editProduct(product)">
            <el-icon><Edit /></el-icon>编辑
          </el-button>
          <el-button
            v-if="product.status === 'active'"
            type="warning"
            link
            size="small"
            @click="handleOffline(product)"
          >
            <el-icon><Bottom /></el-icon>下架
          </el-button>
          <el-button
            v-if="product.status === 'offline' || product.status === 'audit_failed'"
            type="success"
            link
            size="small"
            @click="handleRelist(product)"
          >
            <el-icon><Top /></el-icon>上架
          </el-button>
          <el-button
            v-if="['offline', 'audit_failed', 'banned'].includes(product.status)"
            type="danger"
            link
            size="small"
            @click="handleDelete(product)"
          >
            <el-icon><Delete /></el-icon>删除
          </el-button>
        </div>
      </div>

      <el-empty v-if="!loading && products.length === 0" description="暂无商品">
        <el-button type="primary" @click="publishDialogVisible = true">发布商品</el-button>
      </el-empty>
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

    <!-- 发布/编辑弹窗 -->
    <PublishProductDialog
      v-model="publishDialogVisible"
      :product="editingProduct"
      @success="handlePublishSuccess"
    />
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.my-products-page {
  max-width: $container-lg;
  margin: 0 auto;
  padding: $spacing-lg;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: $spacing-lg;

  h1 {
    font-size: $font-size-h2;
    font-weight: $font-weight-semibold;
    margin: 0;
  }
}

.filter-bar {
  margin-bottom: $spacing-lg;
}

.product-list {
  min-height: 300px;
}

.product-item {
  display: flex;
  gap: $spacing-md;
  padding: $spacing-md;
  background: $color-bg-card;
  border-radius: $radius-lg;
  margin-bottom: $spacing-md;
  box-shadow: $shadow-sm;
  transition: box-shadow $transition-fast;

  &:hover {
    box-shadow: $shadow-md;
  }
}

.product-image {
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

.product-info {
  flex: 1;
  min-width: 0;
  cursor: pointer;
}

.product-name {
  font-size: $font-size-body;
  font-weight: $font-weight-medium;
  color: $color-text-primary;
  margin: 0 0 $spacing-sm;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-meta {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  margin-bottom: $spacing-sm;
}

.price {
  font-size: $font-size-h3;
  font-weight: $font-weight-bold;
  color: $color-error;
}

.product-stats {
  display: flex;
  gap: $spacing-md;
  font-size: $font-size-small;
  color: $color-text-secondary;
}

.reject-reason {
  margin-top: $spacing-xs;
}

.product-actions {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: $spacing-xs;
  flex-shrink: 0;
}

.pagination-wrap {
  display: flex;
  justify-content: center;
  margin-top: $spacing-xl;
}

@media (max-width: $breakpoint-sm) {
  .product-item {
    flex-direction: column;
  }

  .product-image {
    width: 100%;
    height: 200px;
  }

  .product-actions {
    flex-direction: row;
    justify-content: flex-start;
    padding-top: $spacing-sm;
    border-top: 1px solid $color-border;
  }
}
</style>