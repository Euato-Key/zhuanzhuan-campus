<script setup lang="ts">
import { getOssUrl } from '@/utils/oss'
import { useRouter } from 'vue-router'
import type { ProductCardItem } from '@/stores/ai-assistant'

const props = defineProps<{ products: ProductCardItem[] }>()
const router = useRouter()

const CONDITION_LABELS: Record<string, string> = {
  'new': '全新', '99new': '99新', '95new': '95新', '90new': '9成新', '80new': '8成新及以下',
}
const DELIVERY_LABELS: Record<string, string> = {
  'self': '自提', 'express': '快递', 'both': '自提/快递',
}

function go(id: number) { router.push({ name: 'ProductDetail', params: { id } }) }
</script>

<template>
  <div class="card-list">
    <div v-for="(p, idx) in products" :key="p?.id || idx" class="mini-card" @click="go(p?.id)">
      <img :src="p?.images?.[0] ? getOssUrl(p.images[0]) : '/placeholder.png'" class="mini-card-img" />
      <div class="mini-card-info">
        <div class="mini-card-name">{{ p?.name }}</div>
        <div class="mini-card-meta">
          <span v-if="p?.itemCondition">{{ CONDITION_LABELS[p.itemCondition] || p.itemCondition }}</span>
          <span v-if="p?.deliveryType">{{ DELIVERY_LABELS[p.deliveryType] || p.deliveryType }}</span>
          <span v-if="p?.categoryName">{{ p.categoryName }}</span>
        </div>
        <div class="mini-card-price">¥{{ p?.currentPrice ?? p?.price ?? 0 }}</div>
      </div>
      <el-tag v-if="p?.favoriteCount > 0" size="small" type="warning">{{ p.favoriteCount }}收藏</el-tag>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;
.card-list { display: flex; flex-direction: column; gap: $spacing-sm; }
.mini-card {
  display: flex; align-items: center; gap: 10px; padding: $spacing-sm;
  background: $color-bg-card; border-radius: $radius-md;
  border: 1px solid $color-border-light; cursor: pointer;
  transition: box-shadow $transition-fast;
  &:hover { box-shadow: $shadow-sm; }
}
.mini-card-img { width: 48px; height: 48px; border-radius: $radius-sm; object-fit: cover; flex-shrink: 0; }
.mini-card-info { flex: 1; min-width: 0; }
.mini-card-name { font-size: $font-size-body; color: $color-text-primary; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mini-card-price { font-size: $font-size-body; font-weight: $font-weight-semibold; color: $color-error; }
.mini-card-meta { display: flex; gap: 6px; flex-wrap: wrap; font-size: $font-size-tiny; color: $color-text-placeholder; }
.mini-card-meta span { padding: 1px 6px; background: $color-bg-page; border-radius: $radius-sm; border: 1px solid $color-border-light; }
</style>