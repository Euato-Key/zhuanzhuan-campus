<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Check, Close, Lock, Bottom } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import {
  approveProduct,
  rejectProduct,
  banProduct,
  forceOfflineProduct,
  type MyProductItem,
  ITEM_CONDITION_LABELS,
  PRODUCT_STATUS_LABELS,
} from '@/api/modules/product'

const props = defineProps<{
  modelValue: boolean
  product: MyProductItem | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'success'): void
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const loading = ref(false)
const rejectReason = ref('')
const showRejectInput = ref(false)

// 当前图片索引
const currentImageIndex = ref(0)

// 所有图片（主图+详情图）
const allImages = computed(() => {
  if (!props.product) return []
  return [...(props.product.images || []), ...(props.product.detailImages || [])]
})

// 交易方式文本
const deliveryTypeText = computed(() => {
  if (!props.product) return ''
  const map: Record<string, string> = {
    self: '仅自提',
    express: '仅快递',
    both: '自提/快递',
  }
  return map[props.product.deliveryType] || props.product.deliveryType
})

// 状态标签类型
const statusType = computed(() => {
  if (!props.product) return 'info'
  const map: Record<string, string> = {
    active: 'success',
    pending: 'warning',
    banned: 'danger',
    offline: 'info',
    audit_failed: 'danger',
  }
  return map[props.product.status] || 'info'
})

// 审核通过
async function handleApprove() {
  if (!props.product) return
  loading.value = true
  try {
    const res = await approveProduct(props.product.id)
    if (res.data.code === 200) {
      ElMessage.success('审核通过')
      visible.value = false
      emit('success')
    }
  } catch (err) {
    ElMessage.error('操作失败')
  } finally {
    loading.value = false
  }
}

// 显示拒绝输入
function showReject() {
  showRejectInput.value = true
  rejectReason.value = ''
}

// 取消拒绝
function cancelReject() {
  showRejectInput.value = false
  rejectReason.value = ''
}

// 确认拒绝
async function confirmReject() {
  if (!props.product) return
  if (!rejectReason.value.trim()) {
    ElMessage.warning('请填写拒绝原因')
    return
  }
  loading.value = true
  try {
    const res = await rejectProduct(props.product.id, rejectReason.value.trim())
    if (res.data.code === 200) {
      ElMessage.success('已拒绝')
      visible.value = false
      emit('success')
    }
  } catch (err) {
    ElMessage.error('操作失败')
  } finally {
    loading.value = false
  }
}

// 强制下架
async function handleForceOffline() {
  if (!props.product) return
  if (!rejectReason.value.trim()) {
    ElMessage.warning('请填写下架原因')
    return
  }
  loading.value = true
  try {
    const res = await forceOfflineProduct(props.product.id, rejectReason.value.trim())
    if (res.data.code === 200) {
      ElMessage.success('已下架')
      visible.value = false
      emit('success')
    }
  } catch (err) {
    ElMessage.error('操作失败')
  } finally {
    loading.value = false
  }
}

// 封禁商品
async function handleBan() {
  if (!props.product) return
  if (!rejectReason.value.trim()) {
    ElMessage.warning('请填写封禁原因')
    return
  }
  loading.value = true
  try {
    const res = await banProduct(props.product.id, rejectReason.value.trim())
    if (res.data.code === 200) {
      ElMessage.success('已封禁')
      visible.value = false
      emit('success')
    }
  } catch (err) {
    ElMessage.error('操作失败')
  } finally {
    loading.value = false
  }
}

// 切换图片
function prevImage() {
  if (currentImageIndex.value > 0) {
    currentImageIndex.value--
  }
}

function nextImage() {
  if (currentImageIndex.value < allImages.value.length - 1) {
    currentImageIndex.value++
  }
}

// 重置状态
watch(visible, (val) => {
  if (val) {
    currentImageIndex.value = 0
    showRejectInput.value = false
    rejectReason.value = ''
  }
})
</script>

<template>
  <el-dialog
    v-model="visible"
    title="商品审核详情"
    width="700px"
    :close-on-click-modal="false"
    destroy-on-close
    class="audit-dialog"
  >
    <div v-if="product" class="product-detail">
      <!-- 左侧图片 -->
      <div class="image-section">
        <div class="main-image">
          <img :src="allImages[currentImageIndex]" alt="商品图片" />
          <div v-if="allImages.length > 1" class="image-nav">
            <span class="nav-btn" :class="{ disabled: currentImageIndex === 0 }" @click="prevImage">
              ‹
            </span>
            <span class="image-counter">{{ currentImageIndex + 1 }} / {{ allImages.length }}</span>
            <span
              class="nav-btn"
              :class="{ disabled: currentImageIndex === allImages.length - 1 }"
              @click="nextImage"
            >
              ›
            </span>
          </div>
        </div>
        <div v-if="allImages.length > 1" class="image-thumbnails">
          <div
            v-for="(img, index) in allImages"
            :key="index"
            class="thumbnail"
            :class="{ active: index === currentImageIndex }"
            @click="currentImageIndex = index"
          >
            <img :src="img" alt="缩略图" />
          </div>
        </div>
      </div>

      <!-- 右侧信息 -->
      <div class="info-section">
        <div class="info-header">
          <h3 class="product-name">{{ product.name }}</h3>
          <el-tag :type="statusType" size="small">
            {{ PRODUCT_STATUS_LABELS[product.status] }}
          </el-tag>
        </div>

        <div class="price-row">
          <span class="current-price">¥{{ product.currentPrice }}</span>
          <span v-if="product.originalPrice" class="original-price">
            ¥{{ product.originalPrice }}
          </span>
          <el-tag v-if="product.bargain" type="warning" size="small">可议价</el-tag>
        </div>

        <div class="info-grid">
          <div class="info-item">
            <span class="label">分类</span>
            <span class="value">{{ product.category?.name || '-' }}</span>
          </div>
          <div class="info-item">
            <span class="label">新旧程度</span>
            <span class="value">{{ ITEM_CONDITION_LABELS[product.itemCondition] || product.itemCondition }}</span>
          </div>
          <div class="info-item">
            <span class="label">库存</span>
            <span class="value">{{ product.stock }}</span>
          </div>
          <div class="info-item">
            <span class="label">品牌</span>
            <span class="value">{{ product.brand || '-' }}</span>
          </div>
          <div class="info-item">
            <span class="label">交易方式</span>
            <span class="value">{{ deliveryTypeText }}</span>
          </div>
          <div class="info-item">
            <span class="label">卖家</span>
            <span class="value">{{ product.user?.username || '-' }}</span>
          </div>
        </div>

        <div v-if="product.pickupAddress" class="info-item full">
          <span class="label">自提地点</span>
          <span class="value">{{ product.pickupAddress }}</span>
        </div>

        <div v-if="product.pickupTime" class="info-item full">
          <span class="label">自提时间</span>
          <span class="value">{{ product.pickupTime }}</span>
        </div>

        <div v-if="product.specs && product.specs.length > 0" class="info-item full">
          <span class="label">规格</span>
          <div class="specs-list">
            <el-tag v-for="spec in product.specs" :key="spec.name" size="small">
              {{ spec.name }}: {{ spec.value }}
            </el-tag>
          </div>
        </div>

        <div v-if="product.tags && product.tags.length > 0" class="info-item full">
          <span class="label">标签</span>
          <div class="tags-list">
            <el-tag v-for="tag in product.tags" :key="tag" size="small" type="info">
              {{ tag }}
            </el-tag>
          </div>
        </div>

        <div class="info-item full">
          <span class="label">描述</span>
          <p class="description">{{ product.description || '暂无描述' }}</p>
        </div>

        <div v-if="product.rejectReason" class="reject-reason">
          <span class="label">拒绝原因</span>
          <p class="reason-text">{{ product.rejectReason }}</p>
        </div>

        <!-- 操作原因输入 -->
        <div v-if="showRejectInput" class="action-input">
          <el-input
            v-model="rejectReason"
            type="textarea"
            :rows="2"
            placeholder="请输入原因（必填）"
            maxlength="200"
            show-word-limit
          />
          <div class="action-btns">
            <el-button size="small" @click="cancelReject">取消</el-button>
            <el-button
              v-if="product.status === 'pending'"
              type="danger"
              size="small"
              :loading="loading"
              @click="confirmReject"
            >
              确认拒绝
            </el-button>
            <el-button
              v-if="product.status === 'active'"
              type="warning"
              size="small"
              :loading="loading"
              @click="handleForceOffline"
            >
              确认下架
            </el-button>
            <el-button
              v-if="product.status === 'active'"
              type="danger"
              size="small"
              :loading="loading"
              @click="handleBan"
            >
              确认封禁
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <!-- 待审核状态 -->
        <template v-if="product?.status === 'pending' && !showRejectInput">
          <el-button @click="visible = false">关闭</el-button>
          <el-button type="danger" @click="showReject">
            <el-icon><Close /></el-icon>拒绝
          </el-button>
          <el-button type="success" :loading="loading" @click="handleApprove">
            <el-icon><Check /></el-icon>通过
          </el-button>
        </template>

        <!-- 在售状态 -->
        <template v-if="product?.status === 'active' && !showRejectInput">
          <el-button @click="visible = false">关闭</el-button>
          <el-button type="warning" @click="showReject">
            <el-icon><Bottom /></el-icon>下架
          </el-button>
          <el-button type="danger" @click="showReject">
            <el-icon><Lock /></el-icon>封禁
          </el-button>
        </template>

        <!-- 其他状态 -->
        <template v-if="product && !['pending', 'active'].includes(product.status) && !showRejectInput">
          <el-button @click="visible = false">关闭</el-button>
        </template>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.product-detail {
  display: flex;
  gap: 24px;
}

.image-section {
  width: 280px;
  flex-shrink: 0;
}

.main-image {
  position: relative;
  width: 100%;
  height: 280px;
  border-radius: $radius-md;
  overflow: hidden;
  background: $color-bg-page;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .image-nav {
    position: absolute;
    bottom: 8px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(0, 0, 0, 0.5);
    padding: 4px 12px;
    border-radius: $radius-full;
    color: #fff;
  }

  .nav-btn {
    cursor: pointer;
    font-size: 16px;
    padding: 0 4px;

    &.disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }
  }

  .image-counter {
    font-size: $font-size-small;
  }
}

.image-thumbnails {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  overflow-x: auto;

  .thumbnail {
    width: 48px;
    height: 48px;
    border-radius: $radius-sm;
    overflow: hidden;
    cursor: pointer;
    border: 2px solid transparent;
    flex-shrink: 0;

    &.active {
      border-color: $color-primary;
    }

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }
}

.info-section {
  flex: 1;
  min-width: 0;
}

.info-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;

  .product-name {
    flex: 1;
    font-size: $font-size-h4;
    font-weight: $font-weight-semibold;
    margin: 0;
  }
}

.price-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 16px;

  .current-price {
    font-size: $font-size-h3;
    font-weight: $font-weight-bold;
    color: $color-error;
  }

  .original-price {
    font-size: $font-size-small;
    color: $color-text-placeholder;
    text-decoration: line-through;
  }
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 12px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;

  &.full {
    grid-column: 1 / -1;
    flex-direction: row;
    align-items: flex-start;
    gap: 8px;
  }

  .label {
    font-size: $font-size-small;
    color: $color-text-secondary;
  }

  .value {
    font-size: $font-size-body;
    color: $color-text-primary;
  }
}

.specs-list,
.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.description {
  margin: 0;
  font-size: $font-size-body;
  color: $color-text-primary;
  line-height: 1.6;
  white-space: pre-wrap;
}

.reject-reason {
  margin-top: 12px;
  padding: 12px;
  background: rgba($color-error, 0.1);
  border-radius: $radius-md;

  .label {
    font-size: $font-size-small;
    color: $color-error;
    font-weight: $font-weight-medium;
  }

  .reason-text {
    margin: 4px 0 0;
    color: $color-error;
  }
}

.action-input {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid $color-border;

  .action-btns {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 8px;
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
