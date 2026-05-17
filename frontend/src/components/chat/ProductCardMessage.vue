<script setup lang="ts">
import type { ProductCardContent } from '@/api/modules/chat'
import { getOssUrl } from '@/utils/oss'

defineProps<{
  content: ProductCardContent
}>()
</script>

<template>
  <router-link :to="`/products/${content.productId}`" class="product-card-msg">
    <div class="product-image">
      <el-image :src="content.image ? getOssUrl(content.image) : ''" fit="cover" />
    </div>
    <div class="product-info">
      <div class="product-name">{{ content.name }}</div>
      <div class="product-price">¥{{ content.price }}</div>
    </div>
    <span class="card-link">查看详情</span>
  </router-link>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;
@use '@/assets/styles/mixins' as *;

.product-card-msg {
  display: flex;
  gap: $spacing-sm;
  padding: $spacing-sm;
  background: $color-bg-card;
  border-radius: $radius-md;
  border: 1px solid $color-border-light;
  cursor: pointer;
  transition: all $transition-fast;
  text-decoration: none;
  color: inherit;
  max-width: 260px;

  &:hover {
    border-color: $color-primary-light;
    box-shadow: $shadow-sm;
  }
}

.product-image {
  width: 60px;
  height: 60px;
  border-radius: $radius-sm;
  overflow: hidden;
  flex-shrink: 0;

  :deep(.el-image) {
    width: 100%;
    height: 100%;
  }
}

.product-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
}

.product-name {
  font-size: $font-size-body;
  color: $color-text-primary;
  @include text-ellipsis(2);
}

.product-price {
  font-size: $font-size-body;
  font-weight: $font-weight-semibold;
  color: $color-error;
  font-family: $font-family-mono;
}

.card-link {
  font-size: $font-size-small;
  color: $color-primary;
  align-self: flex-end;
  white-space: nowrap;
}
</style>