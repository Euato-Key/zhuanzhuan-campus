<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '@/components/layout/AppLayout.vue'
import WantBuyCard from '@/components/want-buy/WantBuyCard.vue'
import PublishWantBuyDialog from '@/components/want-buy/PublishWantBuyDialog.vue'
import {
  getWantBuyList,
  type WantBuyListItem,
  type WantBuyStatus,
  WANT_BUY_STATUS_LABELS,
} from '@/api/modules/want-buy'
import { getCategoryTree, type Category } from '@/api/modules/category'
import { useUserStore } from '@/stores/user'
import { useAuthDialog } from '@/composables/useAuthDialog'
import { showError } from '@/utils/error'

const router = useRouter()
const userStore = useUserStore()
const authDialog = useAuthDialog()

// 数据
const wantBuys = ref<WantBuyListItem[]>([])
const categories = ref<Category[]>([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const pageSize = ref(12)

// 筛选条件
const keyword = ref('')
const categoryId = ref<number | undefined>(undefined)
const status = ref<WantBuyStatus | ''>('')
const sortBy = ref<'time' | 'view' | 'comment'>('time')
const sortOrder = ref<'desc'>('desc')

// 发布弹窗
const publishDialogVisible = ref(false)
const editId = ref<number | undefined>(undefined)

// 状态选项
const statusOptions = [
  { label: '全部', value: '' },
  { label: WANT_BUY_STATUS_LABELS.active, value: 'active' },
  { label: WANT_BUY_STATUS_LABELS.found, value: 'found' },
  { label: WANT_BUY_STATUS_LABELS.closed, value: 'closed' },
  { label: WANT_BUY_STATUS_LABELS.expired, value: 'expired' },
]

// 排序选项
const sortOptions = [
  { label: '最新发布', value: 'time' },
  { label: '最多浏览', value: 'view' },
  { label: '最多评论', value: 'comment' },
]

// 分类选项（扁平化）
const flatCategories = ref<{ id: number; name: string; level: number }[]>([])

// 获取分类
async function fetchCategories() {
  try {
    const res = await getCategoryTree()
    if (res.data.code === 200) {
      categories.value = res.data.data
      const result: { id: number; name: string; level: number }[] = []
      const flatten = (cats: Category[], level = 0) => {
        cats.forEach((cat) => {
          result.push({ id: cat.id, name: cat.name, level })
          if (cat.children?.length) {
            flatten(cat.children, level + 1)
          }
        })
      }
      flatten(categories.value)
      flatCategories.value = result
    }
  } catch (err) {
    console.error('获取分类失败', err)
  }
}

// 获取求购列表
async function fetchWantBuys() {
  loading.value = true
  try {
    const res = await getWantBuyList({
      page: page.value,
      pageSize: pageSize.value,
      keyword: keyword.value || undefined,
      categoryId: categoryId.value,
      status: status.value || undefined,
      sortBy: sortBy.value,
      sortOrder: sortOrder.value,
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

// 分类变化
function handleCategoryChange() {
  page.value = 1
  fetchWantBuys()
}

// 排序变化
function handleSortChange() {
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
  if (!userStore.isLoggedIn) {
    authDialog.open('login')
    return
  }
  editId.value = undefined
  publishDialogVisible.value = true
}

// 点击卡片
function handleCardClick(id: number) {
  router.push({ name: 'WantBuyDetail', params: { id } })
}

// 发布成功
function handlePublishSuccess() {
  fetchWantBuys()
}

// 初始化
onMounted(() => {
  fetchCategories()
  fetchWantBuys()
})

// 监听筛选条件变化
watch([keyword], () => {
  // 搜索框需要手动触发，这里不做自动搜索
})
</script>

<template>
  <AppLayout>
    <!-- 页面头部 -->
    <section class="page-header">
      <div class="header-content">
        <h1 class="page-title">求购社区</h1>
        <p class="page-desc">发布你的求购需求，让卖家主动联系你</p>
      </div>
      <div class="header-actions">
        <el-button type="primary" size="large" @click="handlePublish">
          发布求购
        </el-button>
      </div>
    </section>

    <!-- 筛选栏 -->
    <section class="filter-bar">
      <div class="search-row">
        <el-input
          v-model="keyword"
          placeholder="搜索求购商品..."
          clearable
          class="search-input"
          @keyup.enter="handleSearch"
          @clear="handleSearch"
        >
          <template #append>
            <el-button @click="handleSearch">搜索</el-button>
          </template>
        </el-input>
      </div>

      <div class="filter-row">
        <el-select
          v-model="categoryId"
          placeholder="全部分类"
          clearable
          class="filter-select"
          @change="handleCategoryChange"
        >
          <el-option
            v-for="cat in flatCategories"
            :key="cat.id"
            :label="cat.name"
            :value="cat.id"
            :style="{ paddingLeft: cat.level * 16 + 'px' }"
          />
        </el-select>

        <el-select
          v-model="status"
          placeholder="全部状态"
          clearable
          class="filter-select"
          @change="handleStatusChange"
        >
          <el-option
            v-for="opt in statusOptions"
            :key="opt.value || 'all'"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>

        <el-select
          v-model="sortBy"
          class="filter-select sort-select"
          @change="handleSortChange"
        >
          <el-option
            v-for="opt in sortOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </div>
    </section>

    <!-- 求购列表 -->
    <section class="want-buy-list" v-loading="loading">
      <div class="grid-container">
        <WantBuyCard
          v-for="item in wantBuys"
          :key="item.id"
          :want-buy="item"
          @click="handleCardClick"
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
  background: $color-bg-card;
  border-radius: $radius-md;
  padding: $spacing-md;
  margin-bottom: $spacing-lg;
  box-shadow: $shadow-sm;
}

.search-row {
  margin-bottom: $spacing-md;
}

.search-input {
  max-width: 400px;
}

.filter-row {
  display: flex;
  gap: $spacing-md;
  flex-wrap: wrap;
}

.filter-select {
  width: 140px;
}

.sort-select {
  width: 120px;
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