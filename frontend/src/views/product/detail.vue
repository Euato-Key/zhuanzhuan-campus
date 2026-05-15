<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getProductById,
  type ProductDetail,
  ITEM_CONDITION_LABELS,
  DELIVERY_TYPE_LABELS,
  PRODUCT_STATUS_LABELS,
} from '@/api/product'
import { useUserStore } from '@/stores/user'
import { useAuthDialog } from '@/composables/useAuthDialog'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const authDialog = useAuthDialog()

const loading = ref(true)
const product = ref<ProductDetail | null>(null)

// 是否是卖家
const isOwner = computed(() => {
  return userStore.user && product.value && userStore.user.id === product.value.user.id
})

// 是否可编辑
const canEdit = computed(() => {
  if (!isOwner.value || !product.value) return false
  return ['pending', 'active', 'offline', 'audit_failed'].includes(product.value.status)
})

// 是否可下架
const canOffline = computed(() => {
  return isOwner.value && product.value?.status === 'active'
})

// 是否可重新上架
const canRelist = computed(() => {
  if (!isOwner.value || !product.value) return false
  return ['offline', 'audit_failed'].includes(product.value.status)
})

// 是否可删除
const canDelete = computed(() => {
  if (!isOwner.value || !product.value) return false
  return ['offline', 'audit_failed', 'banned'].includes(product.value.status)
})

// 获取商品详情
async function fetchProduct() {
  loading.value = true
  try {
    const id = route.params.id as string
    const res = await getProductById(id)
    if (res.data.code === 200) {
      product.value = res.data.data
    } else {
      ElMessage.error('商品不存在')
      router.push({ name: 'Products' })
    }
  } catch (err) {
    console.error('获取商品详情失败', err)
    ElMessage.error('获取商品详情失败')
    router.push({ name: 'Products' })
  } finally {
    loading.value = false
  }
}

// 收藏/取消收藏
async function toggleFavorite() {
  if (!userStore.isLoggedIn) {
    authDialog.open('login')
    return
  }
  // TODO: 实现收藏功能
  ElMessage.info('收藏功能开发中')
}

// 联系卖家
function contactSeller() {
  if (!userStore.isLoggedIn) {
    authDialog.open('login')
    return
  }
  if (!product.value) return
  // TODO: 跳转聊天页面
  router.push({
    name: 'Chat',
    query: { userId: product.value.user.id },
  })
}

// 立即购买
function buyNow() {
  if (!userStore.isLoggedIn) {
    authDialog.open('login')
    return
  }
  if (!product.value) return
  // TODO: 跳转订单创建页面
  ElMessage.info('订单功能开发中')
}

// 编辑商品
function editProduct() {
  if (!product.value) return
  // TODO: 打开编辑弹窗
  ElMessage.info('编辑功能开发中')
}

// 下架商品
async function offlineProduct() {
  if (!product.value) return
  try {
    await ElMessageBox.confirm('确定要下架该商品吗？', '提示', { type: 'warning' })
    // TODO: 调用下架API
    ElMessage.success('商品已下架')
    fetchProduct()
  } catch {
    // 用户取消
  }
}

// 重新上架
async function relistProduct() {
  if (!product.value) return
  try {
    await ElMessageBox.confirm('确定要重新上架该商品吗？', '提示', { type: 'info' })
    // TODO: 调用重新上架API
    ElMessage.success('已重新提交审核')
    fetchProduct()
  } catch {
    // 用户取消
  }
}

// 删除商品
async function deleteProduct() {
  if (!product.value) return
  try {
    await ElMessageBox.confirm('确定要删除该商品吗？删除后无法恢复', '警告', { type: 'warning' })
    // TODO: 调用删除API
    ElMessage.success('商品已删除')
    router.push({ name: 'Products' })
  } catch {
    // 用户取消
  }
}

onMounted(() => {
  fetchProduct()
})
</script>

<template>
  <div class="product-detail-page" v-loading="loading">
    <template v-if="product">
      <!-- 商品状态提示 -->
      <div v-if="product.status !== 'active'" class="status-banner">
        <el-alert
          :title="PRODUCT_STATUS_LABELS[product.status]"
          :description="product.rejectReason || ''"
          :type="product.status === 'audit_failed' ? 'error' : 'warning'"
          show-icon
          :closable="false"
        />
      </div>

      <div class="detail-container">
        <!-- 左侧：图片区 -->
        <div class="image-section">
          <div class="main-image">
            <el-image
              :src="product.images[0] || '/placeholder.png'"
              :preview-src-list="product.images"
              fit="cover"
            />
          </div>
          <div class="thumbnail-list" v-if="product.images.length > 1">
            <div
              v-for="(img, index) in product.images"
              :key="index"
              class="thumbnail-item"
            >
              <img :src="img" :alt="`图片${index + 1}`" />
            </div>
          </div>
        </div>

        <!-- 右侧：信息区 -->
        <div class="info-section">
          <h1 class="product-name">{{ product.name }}</h1>

          <div class="price-row">
            <span class="current-price">¥{{ product.currentPrice }}</span>
            <span v-if="product.originalPrice" class="original-price">
              ¥{{ product.originalPrice }}
            </span>
            <el-tag v-if="product.bargain" type="warning" size="small">可议价</el-tag>
          </div>

          <div class="meta-row">
            <span class="meta-item">
              <span class="label">新旧程度</span>
              <span class="value">{{ ITEM_CONDITION_LABELS[product.itemCondition] }}</span>
            </span>
            <span class="meta-item">
              <span class="label">交易方式</span>
              <span class="value">{{ DELIVERY_TYPE_LABELS[product.deliveryType] }}</span>
            </span>
            <span class="meta-item">
              <span class="label">库存</span>
              <span class="value">{{ product.stock }}件</span>
            </span>
          </div>

          <div v-if="product.brand" class="brand-row">
            <span class="label">品牌</span>
            <span class="value">{{ product.brand }}</span>
          </div>

          <!-- 规格 -->
          <div v-if="product.specs?.length" class="specs-row">
            <span class="label">规格</span>
            <div class="specs-list">
              <span v-for="(spec, index) in product.specs" :key="index" class="spec-item">
                {{ spec.name }}: {{ spec.value }}
              </span>
            </div>
          </div>

          <!-- 自提信息 -->
          <div v-if="product.pickupAddress" class="pickup-row">
            <span class="label">自提地点</span>
            <span class="value">{{ product.pickupAddress }}</span>
            <span v-if="product.pickupTime" class="time">({{ product.pickupTime }})</span>
          </div>

          <!-- 统计 -->
          <div class="stats-row">
            <span>{{ product.viewCount }}人浏览</span>
            <span>{{ product.favoriteCount }}人收藏</span>
          </div>

          <!-- 操作按钮 -->
          <div class="action-row">
            <template v-if="!isOwner">
              <el-button type="default" size="large" @click="toggleFavorite">
                {{ product.isFavorited ? '已收藏' : '收藏' }}
              </el-button>
              <el-button type="primary" size="large" @click="contactSeller">
                联系卖家
              </el-button>
              <el-button type="success" size="large" @click="buyNow">
                立即购买
              </el-button>
            </template>
            <template v-else>
              <el-button v-if="canEdit" size="large" @click="editProduct">编辑</el-button>
              <el-button v-if="canOffline" size="large" @click="offlineProduct">下架</el-button>
              <el-button v-if="canRelist" type="primary" size="large" @click="relistProduct">
                重新上架
              </el-button>
              <el-button v-if="canDelete" type="danger" size="large" @click="deleteProduct">
                删除
              </el-button>
            </template>
          </div>

          <!-- 卖家信息 -->
          <div class="seller-section">
            <div class="seller-header">卖家信息</div>
            <div class="seller-card" @click="router.push({ name: 'Profile', params: { id: product.user.id } })">
              <el-avatar :size="48" :src="product.user.avatar || undefined">
                {{ product.user.username.charAt(0) }}
              </el-avatar>
              <div class="seller-info">
                <div class="seller-name">{{ product.user.username }}</div>
                <div class="seller-meta">
                  <span v-if="product.user.school">{{ product.user.school }}</span>
                  <span v-if="product.user.campus">{{ product.user.campus }}</span>
                </div>
                <div class="seller-credit">信用分: {{ product.user.creditScore }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 商品描述 -->
      <div class="description-section">
        <h2>商品描述</h2>
        <p class="description-text">{{ product.description || '暂无描述' }}</p>

        <!-- 详情图片 -->
        <div v-if="product.detailImages?.length" class="detail-images">
          <img
            v-for="(img, index) in product.detailImages"
            :key="index"
            :src="img"
            alt="商品详情图"
          />
        </div>
      </div>

      <!-- 分类和标签 -->
      <div class="category-section">
        <div class="category-info">
          <span class="label">分类：</span>
          <el-tag>{{ product.category.name }}</el-tag>
        </div>
        <div v-if="product.tags?.length" class="tags-info">
          <span class="label">标签：</span>
          <el-tag v-for="tag in product.tags" :key="tag" type="info" size="small">
            {{ tag }}
          </el-tag>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.product-detail-page {
  max-width: $container-xl;
  margin: 0 auto;
  padding: $spacing-lg;
}

.status-banner {
  margin-bottom: $spacing-lg;
}

.detail-container {
  display: flex;
  gap: $spacing-xl;
  margin-bottom: $spacing-xl;
}

.image-section {
  flex-shrink: 0;
  width: 480px;
}

.main-image {
  width: 100%;
  aspect-ratio: 1;
  border-radius: $radius-lg;
  overflow: hidden;
  background: $color-bg-page;

  :deep(.el-image) {
    width: 100%;
    height: 100%;
  }
}

.thumbnail-list {
  display: flex;
  gap: $spacing-sm;
  margin-top: $spacing-md;
  overflow-x: auto;
}

.thumbnail-item {
  width: 60px;
  height: 60px;
  border-radius: $radius-md;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  transition: border-color $transition-fast;

  &:hover,
  &.active {
    border-color: $color-primary;
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.info-section {
  flex: 1;
  min-width: 0;
}

.product-name {
  font-size: $font-size-h2;
  font-weight: $font-weight-semibold;
  color: $color-text-primary;
  margin: 0 0 $spacing-md;
  line-height: $line-height-tight;
}

.price-row {
  display: flex;
  align-items: baseline;
  gap: $spacing-sm;
  margin-bottom: $spacing-lg;
  padding-bottom: $spacing-lg;
  border-bottom: 1px solid $color-border;
}

.current-price {
  font-size: 32px;
  font-weight: $font-weight-bold;
  color: $color-error;
}

.original-price {
  font-size: $font-size-body;
  color: $color-text-placeholder;
  text-decoration: line-through;
}

.meta-row {
  display: flex;
  gap: $spacing-xl;
  margin-bottom: $spacing-md;
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;

  .label {
    font-size: $font-size-small;
    color: $color-text-secondary;
  }

  .value {
    font-size: $font-size-body;
    color: $color-text-primary;
    font-weight: $font-weight-medium;
  }
}

.brand-row,
.specs-row,
.pickup-row {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  margin-bottom: $spacing-sm;

  .label {
    font-size: $font-size-small;
    color: $color-text-secondary;
    min-width: 70px;
  }

  .value {
    color: $color-text-primary;
  }

  .time {
    color: $color-text-secondary;
    font-size: $font-size-small;
  }
}

.specs-list {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-xs;
}

.spec-item {
  padding: $spacing-xs $spacing-sm;
  background: $color-primary-pale;
  border-radius: $radius-sm;
  font-size: $font-size-small;
  color: $color-primary-dark;
}

.stats-row {
  display: flex;
  gap: $spacing-lg;
  color: $color-text-secondary;
  font-size: $font-size-small;
  margin-bottom: $spacing-lg;
}

.action-row {
  display: flex;
  gap: $spacing-md;
  margin-bottom: $spacing-xl;
}

.seller-section {
  background: $color-bg-page;
  border-radius: $radius-lg;
  padding: $spacing-md;
}

.seller-header {
  font-size: $font-size-small;
  color: $color-text-secondary;
  margin-bottom: $spacing-sm;
}

.seller-card {
  display: flex;
  align-items: center;
  gap: $spacing-md;
  cursor: pointer;
  padding: $spacing-sm;
  border-radius: $radius-md;
  transition: background $transition-fast;

  &:hover {
    background: $color-bg-card;
  }
}

.seller-info {
  flex: 1;
}

.seller-name {
  font-weight: $font-weight-medium;
  color: $color-text-primary;
  margin-bottom: $spacing-xs;
}

.seller-meta {
  font-size: $font-size-small;
  color: $color-text-secondary;
  margin-bottom: $spacing-xs;

  span:not(:last-child)::after {
    content: '·';
    margin: 0 $spacing-xs;
  }
}

.seller-credit {
  font-size: $font-size-small;
  color: $color-primary;
}

.description-section {
  background: $color-bg-card;
  border-radius: $radius-lg;
  padding: $spacing-lg;
  margin-bottom: $spacing-lg;
  box-shadow: $shadow-sm;

  h2 {
    font-size: $font-size-h3;
    font-weight: $font-weight-semibold;
    margin: 0 0 $spacing-md;
    padding-bottom: $spacing-md;
    border-bottom: 1px solid $color-border;
  }
}

.description-text {
  color: $color-text-primary;
  line-height: $line-height-relaxed;
  white-space: pre-wrap;
}

.detail-images {
  margin-top: $spacing-lg;

  img {
    width: 100%;
    border-radius: $radius-md;
    margin-bottom: $spacing-md;
  }
}

.category-section {
  background: $color-bg-card;
  border-radius: $radius-lg;
  padding: $spacing-lg;
  box-shadow: $shadow-sm;

  .category-info,
  .tags-info {
    display: flex;
    align-items: center;
    gap: $spacing-sm;

    &:not(:last-child) {
      margin-bottom: $spacing-sm;
    }
  }

  .label {
    color: $color-text-secondary;
    font-size: $font-size-small;
  }
}

@media (max-width: $breakpoint-md) {
  .detail-container {
    flex-direction: column;
  }

  .image-section {
    width: 100%;
  }

  .action-row {
    flex-wrap: wrap;
  }
}
</style>