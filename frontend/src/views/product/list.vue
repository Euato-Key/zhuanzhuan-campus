<script setup lang="ts">
import { ref, reactive, onMounted, watch, computed } from 'vue'
import { useRoute } from 'vue-router'
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
} from '@/api/modules/product'
import PublishProductDialog from '@/components/product/PublishProductDialog.vue'
import AiPublishModal from '@/components/product/AiPublishModal.vue'
import ProductCard from '@/components/product/ProductCard.vue'
import AppLayout from '@/components/layout/AppLayout.vue'

const route = useRoute()

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
const aiPublishVisible = ref(false)

// 计算一级分类
const levelOneCategories = computed(() => {
  return categories.value.filter(cat => !cat.parentId)
})

// 当前选中的一级分类
const selectedLevelOne = ref<number | undefined>(undefined)

// 根据一级分类筛选二级分类
const levelTwoCategories = computed(() => {
  if (!selectedLevelOne.value) return []
  const parent = categories.value.find(cat => cat.id === selectedLevelOne.value)
  return parent?.children || []
})

// 选择一级分类
function selectLevelOne(id: number | undefined) {
  selectedLevelOne.value = id
  // 如果选中的二级分类不属于当前一级分类，清空
  if (queryParams.categoryId) {
    const belongsToCurrentLevelOne = levelTwoCategories.value.some(cat => cat.id === queryParams.categoryId)
    if (!belongsToCurrentLevelOne) {
      queryParams.categoryId = undefined
    }
  }
  handleSearch()
}

// 选择二级分类
function selectLevelTwo(id: number | undefined) {
  queryParams.categoryId = id
  handleSearch()
}

// 获取分类
async function fetchCategories() {
  try {
    const res = await getCategoryTree()
    if (res.data.code === 200) {
      categories.value = res.data.data
      // 分类加载完成后初始化URL参数
      initFromUrl()
      fetchProducts()
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
  selectedLevelOne.value = undefined
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

// 发布成功
function handlePublishSuccess() {
  ElMessage.success('商品发布成功，等待审核')
  fetchProducts()
}

// 从URL读取查询参数
function initFromUrl() {
  const { keyword, categoryId, itemCondition, deliveryType, sortBy, sortOrder } = route.query
  if (keyword) queryParams.keyword = keyword as string
  if (categoryId) {
    queryParams.categoryId = Number(categoryId)
    // 根据categoryId找到对应的一级分类
    const cat = categories.value.find(c => c.id === Number(categoryId))
    if (cat?.parentId) {
      selectedLevelOne.value = cat.parentId
    } else if (cat && !cat.parentId) {
      // 如果选中的是一级分类，设置selectedLevelOne但不设置categoryId
      selectedLevelOne.value = cat.id
      queryParams.categoryId = undefined
    }
  }
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
        <!-- 分类选择器 -->
        <div class="category-selector">
          <div class="category-level-one">
            <el-button
              :type="!selectedLevelOne ? 'primary' : 'default'"
              size="small"
              @click="selectLevelOne(undefined)"
            >
              全部分类
            </el-button>
            <el-button
              v-for="cat in levelOneCategories"
              :key="cat.id"
              :type="selectedLevelOne === cat.id ? 'primary' : 'default'"
              size="small"
              @click="selectLevelOne(cat.id)"
            >
              {{ cat.name }}
            </el-button>
          </div>
          <div class="category-level-two" v-if="selectedLevelOne && levelTwoCategories.length > 0">
            <el-button
              :type="!queryParams.categoryId ? 'primary' : 'default'"
              size="small"
              plain
              @click="selectLevelTwo(undefined)"
            >
              全部
            </el-button>
            <el-button
              v-for="cat in levelTwoCategories"
              :key="cat.id"
              :type="queryParams.categoryId === cat.id ? 'primary' : 'default'"
              size="small"
              plain
              @click="selectLevelTwo(cat.id)"
            >
              {{ cat.name }}
            </el-button>
          </div>
        </div>
      </div>

      <!-- 新旧程度 -->
      <div class="filter-row filter-options">
        <div class="filter-group">
          <span class="filter-label">新旧程度：</span>
          <div class="filter-buttons">
            <el-button
              :type="!queryParams.itemCondition ? 'primary' : 'default'"
              size="small"
              @click="queryParams.itemCondition = undefined; handleSearch()"
            >
              全部
            </el-button>
            <el-button
              v-for="(label, value) in ITEM_CONDITION_LABELS"
              :key="value"
              :type="queryParams.itemCondition === value ? 'primary' : 'default'"
              size="small"
              @click="queryParams.itemCondition = value as ItemCondition; handleSearch()"
            >
              {{ label }}
            </el-button>
          </div>
        </div>
      </div>

      <!-- 交易方式 + 价格 -->
      <div class="filter-row filter-options">
        <!-- 交易方式 -->
        <div class="filter-group">
          <span class="filter-label">交易方式：</span>
          <div class="filter-buttons">
            <el-button
              :type="!queryParams.deliveryType ? 'primary' : 'default'"
              size="small"
              @click="queryParams.deliveryType = undefined; handleSearch()"
            >
              全部
            </el-button>
            <el-button
              v-for="(label, value) in DELIVERY_TYPE_LABELS"
              :key="value"
              :type="queryParams.deliveryType === value ? 'primary' : 'default'"
              size="small"
              @click="queryParams.deliveryType = value as DeliveryType; handleSearch()"
            >
              {{ label }}
            </el-button>
          </div>
        </div>

        <!-- 价格筛选 -->
        <div class="filter-group price-group">
          <span class="filter-label">价格：</span>
          <div class="price-inputs">
            <el-input-number
              v-model="priceRange[0]"
              :min="0"
              :precision="0"
              placeholder="最低"
              controls-position="right"
              size="small"
              class="price-input"
            />
            <span class="price-separator">-</span>
            <el-input-number
              v-model="priceRange[1]"
              :min="0"
              :precision="0"
              placeholder="最高"
              controls-position="right"
              size="small"
              class="price-input"
            />
            <el-button type="primary" size="small" @click="applyPriceFilter">确定</el-button>
          </div>
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
      <ProductCard
        v-for="product in products"
        :key="product.id"
        :product="product"
      />

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
    <div class="publish-actions">
      <el-button
        type="primary"
        class="publish-btn"
        :icon="Plus"
        circle
        size="large"
        @click="publishDialogVisible = true"
      />
      <el-button
        class="ai-publish-btn"
        size="large"
        @click="aiPublishVisible = true"
      >
        <svg class="ai-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 20px; height: 20px">
          <path d="M12 2L14.5 9H22L16 13.5L18.5 21L12 16.5L5.5 21L8 13.5L2 9H9.5L12 2Z" fill="currentColor" opacity="0.6"/>
          <circle cx="12" cy="12" r="3" fill="currentColor"/>
        </svg>
        AI
      </el-button>
    </div>

    <!-- 发布商品弹窗 -->
    <PublishProductDialog
      v-model="publishDialogVisible"
      @success="handlePublishSuccess"
    />

    <!-- AI 发布弹窗 -->
    <AiPublishModal
      v-model="aiPublishVisible"
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

// 分类选择器样式
.category-selector {
  width: 100%;
  background: $color-bg-page;
  border-radius: $radius-md;
  padding: $spacing-md;
}

.category-level-one {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-sm;
  margin-bottom: $spacing-sm;
}

.category-level-two {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-xs;
  padding-top: $spacing-sm;
  border-top: 1px dashed $color-border;

  .el-button {
    font-size: $font-size-small;
  }
}

.search-input {
  flex: 1;
  min-width: 300px;
  max-width: 500px;
}

// 筛选条件行
.filter-options {
  background: $color-bg-page;
  border-radius: $radius-md;
  padding: $spacing-md;
  gap: $spacing-lg;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
}

.filter-label {
  font-size: $font-size-small;
  color: $color-text-secondary;
  white-space: nowrap;
}

.filter-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-xs;
}

.price-group {
  margin-left: auto;
}

.price-inputs {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
}

.price-input {
  width: 90px;
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

.pagination-wrap {
  display: flex;
  justify-content: center;
  margin-top: $spacing-xl;
}

.publish-actions {
  position: fixed;
  right: 40px;
  bottom: 80px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 100;
}

.publish-btn {
  width: 56px;
  height: 56px;
  box-shadow: $shadow-primary;
}

.ai-publish-btn {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: none;
  color: #fff;
  font-size: $font-size-small;
  font-weight: $font-weight-semibold;
  background: linear-gradient(135deg, #4CAF50, #2196F3);
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  transition: all $transition-normal;

  .ai-icon {
    animation: ai-sparkle 2s ease-in-out infinite;
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(76, 175, 80, 0.4);
  }
}

@keyframes ai-sparkle {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.15); }
}

@media (max-width: $breakpoint-md) {
  .filter-row {
    flex-direction: column;
  }

  .search-input {
    max-width: none;
  }

  .filter-options {
    flex-direction: column;
    align-items: flex-start;
  }

  .filter-group {
    width: 100%;
    flex-wrap: wrap;
  }

  .price-group {
    margin-left: 0;
    width: 100%;
  }

  .price-inputs {
    width: 100%;
  }

  .price-input {
    flex: 1;
  }

  .category-level-one {
    justify-content: center;
  }

  .category-level-two {
    justify-content: center;
  }
}
</style>
