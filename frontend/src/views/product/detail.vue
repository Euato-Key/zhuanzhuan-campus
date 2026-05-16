<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Back } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getProductById,
  type ProductDetail,
  DELIVERY_TYPE_LABELS,
  PRODUCT_STATUS_LABELS,
  getItemConditionLabel,
} from '@/api/product'
import { useUserStore } from '@/stores/user'
import { useAuthDialog } from '@/composables/useAuthDialog'
import { getOssUrl } from '@/utils/oss'
import AppLayout from '@/components/layout/AppLayout.vue'

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

// 卖家头像URL
const sellerAvatar = computed(() => {
  if (!product.value?.user?.avatar) return undefined
  return getOssUrl(product.value.user.avatar)
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

// 返回上一页
function goBack() {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push({ name: 'Products' })
  }
}

// 查看卖家主页
function viewSellerProfile() {
  if (!product.value) return
  router.push({ name: 'UserProfile', params: { id: product.value.user.id } })
}

onMounted(() => {
  fetchProduct()
})
</script>

<template>
  <AppLayout>
    <div class="product-detail-page" v-loading="loading">
    <template v-if="product">
      <!-- 返回按钮 -->
      <div class="back-nav">
        <el-button link class="back-btn" @click="goBack">
          <el-icon><Back /></el-icon>
          返回
        </el-button>
      </div>

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

      <!-- 卖家信息卡片（顶部） -->
      <div class="seller-card-top">
        <div class="seller-avatar" @click="viewSellerProfile">
          <el-avatar :size="56" :src="sellerAvatar">
            {{ product.user.username.charAt(0) }}
          </el-avatar>
        </div>
        <div class="seller-details">
          <div class="seller-name-row">
            <span class="seller-name">{{ product.user.username }}</span>
            <el-tag v-if="product.user.school" size="small" type="info">{{ product.user.school }}</el-tag>
          </div>
          <div class="seller-meta-row">
            <span v-if="product.user.campus" class="meta-item">
              <el-icon><i class="el-icon-location"></i></el-icon>
              {{ product.user.campus }}
            </span>
            <span class="meta-item credit">
              <el-icon><i class="el-icon-star"></i></el-icon>
              信用 {{ product.user.creditScore }}
            </span>
          </div>
        </div>
        <div class="seller-actions">
          <el-button size="default" @click="viewSellerProfile">
            查看主页
          </el-button>
        </div>
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
          <!-- 分类 -->
          <div class="category-row">
            <el-tag class="category-tag" effect="plain">
              {{ product.category.name }}
            </el-tag>
          </div>

          <h1 class="product-name">{{ product.name }}</h1>

          <!-- 标签 -->
          <div v-if="product.tags?.length" class="tags-row">
            <span class="label">标签：</span>
            <el-tag
              v-for="tag in product.tags"
              :key="tag"
              size="small"
              type="info"
              effect="plain"
            >
              {{ tag }}
            </el-tag>
          </div>

          <div class="price-row">
            <span class="current-price">¥{{ product.currentPrice }}</span>
            <span v-if="product.originalPrice" class="original-price">
              ¥{{ product.originalPrice }}
            </span>
            <el-tag v-if="product.bargain" type="warning" size="small">可议价</el-tag>
          </div>

          <div class="meta-grid">
            <div class="meta-item">
              <span class="label">新旧程度</span>
              <span class="value">{{ getItemConditionLabel(product.itemCondition) }}</span>
            </div>
            <div class="meta-item">
              <span class="label">交易方式</span>
              <span class="value">{{ DELIVERY_TYPE_LABELS[product.deliveryType] }}</span>
            </div>
            <div class="meta-item">
              <span class="label">库存</span>
              <span class="value">{{ product.stock }}件</span>
            </div>
            <div v-if="product.brand" class="meta-item">
              <span class="label">品牌</span>
              <span class="value">{{ product.brand }}</span>
            </div>
          </div>

          <!-- 规格 -->
          <div v-if="product.specs?.length" class="specs-row">
            <span class="label">规格</span>
            <div class="specs-list">
              <el-tag v-for="(spec, index) in product.specs" :key="index" size="small">
                {{ spec.name }}: {{ spec.value }}
              </el-tag>
            </div>
          </div>

          <!-- 自提信息 -->
          <div v-if="product.pickupAddress" class="pickup-row">
            <el-icon><i class="el-icon-location"></i></el-icon>
            <span>自提：{{ product.pickupAddress }}</span>
            <span v-if="product.pickupTime" class="time">（{{ product.pickupTime }}）</span>
          </div>

          <!-- 统计 -->
          <div class="stats-row">
            <span><el-icon><i class="el-icon-view"></i></el-icon> {{ product.viewCount }} 浏览</span>
            <span><el-icon><i class="el-icon-star"></i></el-icon> {{ product.favoriteCount }} 收藏</span>
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
    </template>
  </div>
  </AppLayout>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.product-detail-page {
  max-width: $container-xl;
  margin: 0 auto;
  padding: $spacing-lg;
}

.back-nav {
  margin-bottom: $spacing-md;

  .back-btn {
    color: $color-text-secondary;
    font-size: $font-size-body;

    &:hover {
      color: $color-primary;
    }

    .el-icon {
      margin-right: $spacing-xs;
    }
  }
}

.status-banner {
  margin-bottom: $spacing-lg;
}

// 卖家信息卡片（顶部）
.seller-card-top {
  display: flex;
  align-items: center;
  gap: $spacing-lg;
  background: $color-bg-card;
  border-radius: $radius-lg;
  padding: $spacing-md $spacing-lg;
  margin-bottom: $spacing-lg;
  box-shadow: $shadow-sm;
}

.seller-avatar {
  cursor: pointer;
  transition: transform $transition-fast;

  &:hover {
    transform: scale(1.05);
  }
}

.seller-details {
  flex: 1;
}

.seller-name-row {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  margin-bottom: $spacing-xs;
}

.seller-name {
  font-size: $font-size-h4;
  font-weight: $font-weight-semibold;
  color: $color-text-primary;
}

.seller-meta-row {
  display: flex;
  gap: $spacing-md;

  .meta-item {
    display: flex;
    align-items: center;
    gap: $spacing-xs;
    font-size: $font-size-small;
    color: $color-text-secondary;

    &.credit {
      color: $color-primary;
    }
  }
}

.seller-actions {
  flex-shrink: 0;
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

.category-row {
  margin-bottom: $spacing-sm;

  .category-tag {
    color: $color-primary;
    border-color: $color-primary;
  }
}

.product-name {
  font-size: $font-size-h2;
  font-weight: $font-weight-semibold;
  color: $color-text-primary;
  margin: 0 0 $spacing-sm;
  line-height: $line-height-tight;
}

.tags-row {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  margin-bottom: $spacing-md;

  .label {
    font-size: $font-size-small;
    color: $color-text-secondary;
  }
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

.meta-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: $spacing-md;
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

.specs-row {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  margin-bottom: $spacing-md;

  .label {
    font-size: $font-size-small;
    color: $color-text-secondary;
  }
}

.specs-list {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-xs;
}

.pickup-row {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  margin-bottom: $spacing-md;
  padding: $spacing-sm $spacing-md;
  background: $color-primary-pale;
  border-radius: $radius-md;
  color: $color-primary-dark;
  font-size: $font-size-body;

  .time {
    font-size: $font-size-small;
    color: $color-text-secondary;
  }
}

.stats-row {
  display: flex;
  gap: $spacing-lg;
  color: $color-text-secondary;
  font-size: $font-size-small;
  margin-bottom: $spacing-lg;

  span {
    display: flex;
    align-items: center;
    gap: $spacing-xs;
  }
}

.action-row {
  display: flex;
  gap: $spacing-md;
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

@media (max-width: $breakpoint-md) {
  .seller-card-top {
    flex-wrap: wrap;
    text-align: center;

    .seller-details {
      width: 100%;
    }

    .seller-actions {
      width: 100%;
      margin-top: $spacing-sm;
    }
  }

  .detail-container {
    flex-direction: column;
  }

  .image-section {
    width: 100%;
  }

  .meta-grid {
    grid-template-columns: 1fr;
  }

  .action-row {
    flex-wrap: wrap;
  }
}
</style>