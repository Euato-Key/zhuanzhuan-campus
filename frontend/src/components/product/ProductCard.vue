<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { getOssUrl } from '@/utils/oss'
import { getItemConditionLabel, DELIVERY_TYPE_LABELS } from '@/api/product'
import type { ProductListItem } from '@/api/product'

const props = defineProps<{
  product: ProductListItem
}>()

const router = useRouter()

// 商品图片
const productImage = computed(() => {
  return props.product.images?.[0] || '/placeholder.png'
})

// 用户头像
const userAvatar = computed(() => {
  if (!props.product.user?.avatar) return undefined
  return getOssUrl(props.product.user.avatar)
})

// 用户名首字母（安全处理空值）
const userInitial = computed(() => {
  return props.product.user?.username?.charAt(0) || '?'
})

// 新旧程度显示
const conditionLabel = computed(() => {
  return getItemConditionLabel(props.product.itemCondition)
})

// 交易方式显示
const deliveryLabel = computed(() => {
  return DELIVERY_TYPE_LABELS[props.product.deliveryType]
})

// 跳转详情
function goToDetail() {
  router.push({ name: 'ProductDetail', params: { id: props.product.id } })
}
</script>

<template>
  <div class="product-card" @click="goToDetail">
    <div class="product-image">
      <img :src="productImage" :alt="product.name" />
      <div v-if="product.bargain" class="bargain-tag">可议价</div>
    </div>
    <div class="product-info">
      <h3 class="product-name">{{ product.name }}</h3>
      <div class="product-meta">
        <span class="condition-tag">{{ conditionLabel }}</span>
        <span class="delivery-tag">{{ deliveryLabel }}</span>
      </div>
      <div class="product-price">
        <span class="current-price">¥{{ product.currentPrice }}</span>
        <span v-if="product.originalPrice" class="original-price">
          ¥{{ product.originalPrice }}
        </span>
      </div>
      <div class="product-footer">
        <div class="seller-info">
          <el-avatar :size="20" :src="userAvatar">
            {{ userInitial }}
          </el-avatar>
          <span class="seller-name">{{ product.user?.username || '匿名用户' }}</span>
        </div>
        <div class="stats">
          <span>{{ product.viewCount }}浏览</span>
          <span>{{ product.favoriteCount }}收藏</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

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
</style>