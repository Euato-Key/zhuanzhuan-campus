<script setup lang="ts">
import { ref, reactive, onMounted, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Search, Plus, ArrowDown, ArrowUp } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import {
  getProductList,
  getCategoryTree,
  type ProductListItem,
  type Category,
  ITEM_CONDITION_LABELS,
  DELIVERY_TYPE_LABELS,
  type ItemCondition,
  type DeliveryType,
} from '@/api/product'
import PublishProductDialog from '@/components/product/PublishProductDialog.vue'
import AppLayout from '@/components/layout/AppLayout.vue'

const route = useRoute()
const router = useRouter()

// 状态
const loading = ref(false)
const products = ref<ProductListItem[]>([])
const total = ref(0)
const categories = ref<Category[]>([])

// 查询参数
const queryParams = reactive({
  page: 1,
  pageSize: 20,
  keyword: '',
  categoryId: undefined as number | undefined,
  itemCondition: undefined as ItemCondition | undefined,
  minPrice: undefined as number | undefined,
  maxPrice: undefined as number | undefined,
  deliveryType: undefined as DeliveryType | undefined,
  sortBy: 'time' as 'price' | 'time' | 'favorite',
  sortOrder: 'desc' as 'asc' | 'desc',
})

// 价格筛选
const priceRange = ref<[number | undefined, number | undefined]>([undefined, undefined])

// 发布弹窗
const publishDialogVisible = ref(false)

// 计算分类选项（扁平化）
const flatCategories = computed(() => {
  const result: { id: number; name: string; parentId: number | null }[] = []
  const flatten = (cats: Category[], level = 0) => {
    cats.forEach(cat => {
      result.push({
        id: cat.id,
        name: level > 0 ? `${'　'.repeat(level)}├ ${cat.name}` : cat.name,
        parentId: cat.parentId,
      })
      if (cat.children?.length) {
        flatten(cat.children, level + 1)
      }
    })
  }
  flatten(categories.value)
  return result
})

// 获取分类
async function fetchCategories() {
  try {
    const res = await getCategoryTree()
    if (res.data.code === 200) {
      categories.value = res.data.data
    }
  } catch (err) {
    console.error('获取分类失败', err)
  }
}

// 获取商品列表
async function fetchProducts() {
  loading.value = true
  try {
    const res = await getProductList(queryParams)
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

// 重置筛选
function handleReset() {
  queryParams.keyword = ''
  queryParams.categoryId = undefined
  queryParams.itemCondition = undefined
  queryParams.minPrice = undefined
  queryParams.maxPrice = undefined
  queryParams.deliveryType = undefined
  queryParams.sortBy = 'time'
  queryParams.sortOrder = 'desc'
  priceRange.value = [undefined, undefined]
  handleSearch()
}

// 应用价格筛选
function applyPriceFilter() {
  queryParams.minPrice = priceRange.value[0]
  queryParams.maxPrice = priceRange.value[1]
  handleSearch()
}

// 切换排序
function toggleSort(sortBy: 'price' | 'time' | 'favorite') {
  if (queryParams.sortBy === sortBy) {
    queryParams.sortOrder = queryParams.sortOrder === 'asc' ? 'desc' : 'asc'
  } else {
    queryParams.sortBy = sortBy
    queryParams.sortOrder = 'desc'
  }
  handleSearch()
}

// 分页变化
function handlePageChange(page: number) {
  queryParams.page = page
  fetchProducts()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// 跳转商品详情
function goToDetail(product: ProductListItem) {
  router.push({ name: 'ProductDetail', params: { id: product.id } })
}

// 发布成功
function handlePublishSuccess() {
  ElMessage.success('商品发布成功，等待审核')
  fetchProducts()
}

// 从URL读取查询参数
function initFromUrl() {
  const { keyword, categoryId, itemCondition, deliveryType, sortBy, sortOrder } = route.query
  if (keyword) queryParams.keyword = keyword as string
  if (categoryId) queryParams.categoryId = Number(categoryId)
  if (itemCondition) queryParams.itemCondition = itemCondition as ItemCondition
  if (deliveryType) queryParams.deliveryType = deliveryType as DeliveryType
  if (sortBy) queryParams.sortBy = sortBy as 'price' | 'time' | 'favorite'
  if (sortOrder) queryParams.sortOrder = sortOrder as 'asc' | 'desc'
}

// 监听路由变化
watch(() => route.query, () => {
  initFromUrl()
  fetchProducts()
}, { deep: true })

onMounted(() => {
  fetchCategories()
  initFromUrl()
  fetchProducts()
})
</script>

<template>
  <AppLayout>
    <div class="product-list-page">
    <!-- 搜索筛选区 -->
    <div class="filter-section">
      <div class="filter-row">
        <el-input
          v-model="queryParams.keyword"
          placeholder="搜索商品名称、描述、品牌"
          :prefix-icon="Search"
          clearable
          class="search-input"
          @keyup.enter="handleSearch"
          @clear="handleSearch"
        />
        <el-button type="primary" @click="handleSearch">搜索</el-button>
        <el-button @click="handleReset">重置</el-button>
      </div>
        
      <div class="filter-row">
        <el-select
          v-model="queryParams.categoryId"
          placeholder="全部分类"
          clearable
          class="filter-select"
          @change="handleSearch"
        >
          <el-option
            v-for="cat in flatCategories"
            :key="cat.id"
            :label="cat.name"
            :value="cat.id"
          />
        </el-select>

        <el-select
          v-model="queryParams.itemCondition"
          placeholder="新旧程度"
          clearable
          class="filter-select"
          @change="handleSearch"
        >
          <el-option
            v-for="(label, value) in ITEM_CONDITION_LABELS"
            :key="value"
            :label="label"
            :value="value"
          />
        </el-select>

        <el-select
          v-model="queryParams.deliveryType"
          placeholder="交易方式"
          clearable
          class="filter-select"
          @change="handleSearch"
        >
          <el-option
            v-for="(label, value) in DELIVERY_TYPE_LABELS"
            :key="value"
            :label="label"
            :value="value"
          />
        </el-select>

        <div class="price-filter">
          <el-input-number
            v-model="priceRange[0]"
            :min="0"
            :precision="0"
            placeholder="最低价"
            controls-position="right"
            class="price-input"
          />
          <span class="price-separator">-</span>
          <el-input-number
            v-model="priceRange[1]"
            :min="0"
            :precision="0"
            placeholder="最高价"
            controls-position="right"
            class="price-input"
          />
          <el-button type="primary" link @click="applyPriceFilter">确定</el-button>
        </div>
      </div>

      <!-- 排序 -->
      <div class="sort-row">
        <span class="sort-label">排序：</span>
        <el-button
          :type="queryParams.sortBy === 'time' ? 'primary' : 'default'"
          text
          @click="toggleSort('time')"
        >
          最新发布
          <el-icon v-if="queryParams.sortBy === 'time'">
            <ArrowDown v-if="queryParams.sortOrder === 'desc'" />
            <ArrowUp v-else />
          </el-icon>
        </el-button>
        <el-button
          :type="queryParams.sortBy === 'price' ? 'primary' : 'default'"
          text
          @click="toggleSort('price')"
        >
          价格
          <el-icon v-if="queryParams.sortBy === 'price'">
            <ArrowDown v-if="queryParams.sortOrder === 'desc'" />
            <ArrowUp v-else />
          </el-icon>
        </el-button>
        <el-button
          :type="queryParams.sortBy === 'favorite' ? 'primary' : 'default'"
          text
          @click="toggleSort('favorite')"
        >
          最多收藏
        </el-button>
      </div>
    </div>

    <!-- 商品列表 -->
    <div class="product-grid" v-loading="loading">
      <div
        v-for="product in products"
        :key="product.id"
        class="product-card"
        @click="goToDetail(product)"
      >
        <div class="product-image">
          <img :src="product.images[0] || '/placeholder.png'" :alt="product.name" />
          <div v-if="product.bargain" class="bargain-tag">可议价</div>
        </div>
        <div class="product-info">
          <h3 class="product-name">{{ product.name }}</h3>
          <div class="product-meta">
            <span class="condition-tag">{{ ITEM_CONDITION_LABELS[product.itemCondition] }}</span>
            <span class="delivery-tag">{{ DELIVERY_TYPE_LABELS[product.deliveryType] }}</span>
          </div>
          <div class="product-price">
            <span class="current-price">¥{{ product.currentPrice }}</span>
            <span v-if="product.originalPrice" class="original-price">
              ¥{{ product.originalPrice }}
            </span>
          </div>
          <div class="product-footer">
            <div class="seller-info">
              <el-avatar :size="20" :src="product.user.avatar || undefined">
                {{ product.user.username.charAt(0) }}
              </el-avatar>
              <span class="seller-name">{{ product.user.username }}</span>
            </div>
            <div class="stats">
              <span>{{ product.viewCount }}浏览</span>
              <span>{{ product.favoriteCount }}收藏</span>
            </div>
          </div>
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

    <!-- 发布按钮 -->
    <el-button
      type="primary"
      class="publish-btn"
      :icon="Plus"
      circle
      size="large"
      @click="publishDialogVisible = true"
    />

    <!-- 发布商品弹窗 -->
    <PublishProductDialog
      v-model="publishDialogVisible"
      @success="handlePublishSuccess"
    />
  </div>
  </AppLayout>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.product-list-page {
  max-width: $container-xl;
  margin: 0 auto;
  padding: $spacing-md;
}

.filter-section {
  background: $color-bg-card;
  border-radius: $radius-lg;
  padding: $spacing-lg;
  margin-bottom: $spacing-lg;
  box-shadow: $shadow-sm;
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-md;
  margin-bottom: $spacing-md;

  &:last-child {
    margin-bottom: 0;
  }
}

.search-input {
  flex: 1;
  min-width: 300px;
  max-width: 500px;
}

.filter-select {
  width: 140px;
}

.price-filter {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
}

.price-input {
  width: 100px;
}

.price-separator {
  color: $color-text-secondary;
}

.sort-row {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  padding-top: $spacing-md;
  border-top: 1px solid $color-border;
}

.sort-label {
  color: $color-text-secondary;
  font-size: $font-size-small;
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: $spacing-lg;
  min-height: 200px;
}

.product-card {
  background: $color-bg-card;
  border-radius: $radius-lg;
  overflow: hidden;
  cursor: pointer;
  transition: transform $transition-fast, box-shadow $transition-fast;
  box-shadow: $shadow-sm;

  &:hover {
    transform: translateY(-4px);
    box-shadow: $shadow-hover;
  }
}

.product-image {
  position: relative;
  aspect-ratio: 1;
  background: $color-bg-page;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .bargain-tag {
    position: absolute;
    top: $spacing-sm;
    right: $spacing-sm;
    background: $color-accent-orange;
    color: #fff;
    font-size: $font-size-tiny;
    padding: 2px 6px;
    border-radius: $radius-sm;
  }
}

.product-info {
  padding: $spacing-md;
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
  gap: $spacing-xs;
  margin-bottom: $spacing-sm;
}

.condition-tag,
.delivery-tag {
  font-size: $font-size-tiny;
  padding: 2px 6px;
  border-radius: $radius-sm;
  background: $color-primary-pale;
  color: $color-primary-dark;
}

.product-price {
  margin-bottom: $spacing-sm;

  .current-price {
    font-size: $font-size-h3;
    font-weight: $font-weight-bold;
    color: $color-error;
  }

  .original-price {
    font-size: $font-size-small;
    color: $color-text-placeholder;
    text-decoration: line-through;
    margin-left: $spacing-xs;
  }
}

.product-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.seller-info {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
}

.seller-name {
  font-size: $font-size-small;
  color: $color-text-secondary;
}

.stats {
  font-size: $font-size-tiny;
  color: $color-text-placeholder;
  display: flex;
  gap: $spacing-sm;
}

.pagination-wrap {
  display: flex;
  justify-content: center;
  margin-top: $spacing-xl;
}

.publish-btn {
  position: fixed;
  right: 40px;
  bottom: 80px;
  width: 56px;
  height: 56px;
  box-shadow: $shadow-primary;
  z-index: 100;
}

@media (max-width: $breakpoint-md) {
  .filter-row {
    flex-direction: column;
  }

  .search-input {
    max-width: none;
  }

  .filter-select {
    width: 100%;
  }

  .price-filter {
    width: 100%;
  }

  .price-input {
    flex: 1;
  }
}
</style>
