<script setup lang="ts">
import { useRouter } from 'vue-router'
import type { ReviewItem } from '@/api/modules/review'
import { REVIEW_STATUS_LABELS, REVIEW_STATUS_TAG_TYPE } from '@/api/modules/review'
import { getOssUrl } from '@/utils/oss'
import { formatRelativeTime } from '@/utils/format'

const router = useRouter()

defineProps<{
  review: ReviewItem
  sellerReply?: ReviewItem | null
  showAppendBtn?: boolean
  showDeleteBtn?: boolean
  showStatus?: boolean
}>()

const emit = defineEmits<{
  append: [reviewId: number]
  delete: [reviewId: number]
  deleteAppend: [reviewId: number]
}>()

function viewUserProfile(userId: number) {
  if (userId === 0) return
  router.push({ name: 'UserProfile', params: { id: userId } })
}
</script>

<template>
  <div class="review-card">
    <!-- 关联商品信息 -->
    <div v-if="review.order" class="order-info-row" @click="router.push({ name: 'OrderDetail', params: { id: review.orderId } })">
      <img
        :src="review.order.productImage ? getOssUrl(review.order.productImage) : '/placeholder.png'"
        alt="商品图片"
        class="order-product-image"
      />
      <div class="order-product-detail">
        <span class="order-product-name">{{ review.order.productName }}</span>
        <span class="order-no-small">订单号: {{ review.order.orderNo }}</span>
      </div>
    </div>

    <div class="review-header">
      <div class="reviewer-info" @click="viewUserProfile(review.reviewer?.id || 0)">
        <el-avatar :size="36" :src="review.reviewer?.avatar ? getOssUrl(review.reviewer.avatar) : undefined">
          {{ review.reviewer?.username?.charAt(0) || '?' }}
        </el-avatar>
        <div class="reviewer-meta">
          <div class="reviewer-name-row">
            <span class="reviewer-name">{{ review.reviewer?.username || '匿名用户' }}</span>
            <el-tag
              :type="review.type === 'buyer_to_seller' ? 'primary' : 'warning'"
              size="small"
              effect="plain"
              class="role-tag"
            >
              {{ review.type === 'buyer_to_seller' ? '买家' : '卖家' }}
            </el-tag>
          </div>
          <el-rate v-if="review.type === 'buyer_to_seller'" :model-value="review.rating" disabled size="small" />
        </div>
      </div>
      <div class="review-header-right">
        <el-tag v-if="showStatus" :type="REVIEW_STATUS_TAG_TYPE[review.status]" size="small">
          {{ REVIEW_STATUS_LABELS[review.status] }}
        </el-tag>
        <span class="review-time">{{ formatRelativeTime(review.createdAt) }}</span>
      </div>
    </div>

    <div v-if="review.content" class="review-content">{{ review.content }}</div>

    <div v-if="review.images && review.images.length > 0" class="review-images">
      <el-image
        v-for="(img, index) in review.images"
        :key="index"
        :src="getOssUrl(img)"
        :preview-src-list="review.images.map(i => getOssUrl(i))"
        fit="cover"
        class="review-image"
      />
    </div>

    <!-- 追评区域 -->
    <div v-if="review.isAppend && review.appendContent" class="append-section">
      <div class="append-header">
        <el-tag size="small" type="info" effect="plain">追评</el-tag>
        <span v-if="review.appendAt" class="append-time">{{ formatRelativeTime(review.appendAt) }}</span>
        <el-button v-if="showDeleteBtn" size="small" type="danger" text @click="emit('deleteAppend', review.id)">删除追评</el-button>
      </div>
      <div class="append-content">{{ review.appendContent }}</div>
      <div v-if="review.appendImages && review.appendImages.length > 0" class="review-images">
        <el-image
          v-for="(img, index) in review.appendImages"
          :key="index"
          :src="getOssUrl(img)"
          :preview-src-list="review.appendImages.map(i => getOssUrl(i))"
          fit="cover"
          class="review-image"
        />
      </div>
    </div>

    <!-- 卖家回复 -->
    <div v-if="sellerReply" class="seller-reply">
      <div class="seller-reply-header">
        <div class="seller-reply-user" @click="viewUserProfile(sellerReply.reviewer?.id || 0)">
          <el-avatar :size="24" :src="sellerReply.reviewer?.avatar ? getOssUrl(sellerReply.reviewer.avatar) : undefined">
            {{ sellerReply.reviewer?.username?.charAt(0) || '?' }}
          </el-avatar>
          <span class="seller-reply-name">{{ sellerReply.reviewer?.username || '匿名用户' }}</span>
          <el-tag type="warning" size="small" effect="plain" class="role-tag">卖家</el-tag>
        </div>
        <span class="review-time">{{ formatRelativeTime(sellerReply.createdAt) }}</span>
      </div>
      <div v-if="sellerReply.content" class="seller-reply-content">{{ sellerReply.content }}</div>
      <div v-if="sellerReply.images && sellerReply.images.length > 0" class="review-images">
        <el-image
          v-for="(img, index) in sellerReply.images"
          :key="index"
          :src="getOssUrl(img)"
          :preview-src-list="sellerReply.images.map(i => getOssUrl(i))"
          fit="cover"
          class="review-image"
        />
      </div>
      <!-- 卖家追评 -->
      <div v-if="sellerReply.isAppend && sellerReply.appendContent" class="seller-append">
        <div class="seller-append-header">
          <el-tag size="small" type="info" effect="plain">追评</el-tag>
          <span v-if="sellerReply.appendAt" class="append-time">{{ formatRelativeTime(sellerReply.appendAt) }}</span>
        </div>
        <div class="seller-append-content">{{ sellerReply.appendContent }}</div>
        <div v-if="sellerReply.appendImages && sellerReply.appendImages.length > 0" class="review-images">
          <el-image
            v-for="(img, index) in sellerReply.appendImages"
            :key="index"
            :src="getOssUrl(img)"
            :preview-src-list="sellerReply.appendImages.map(i => getOssUrl(i))"
            fit="cover"
            class="review-image"
          />
        </div>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div v-if="showAppendBtn || (showDeleteBtn && review.status !== 'deleted')" class="review-actions">
      <el-button v-if="showAppendBtn" size="small" type="primary" plain @click="emit('append', review.id)">追评</el-button>
      <el-button v-if="showDeleteBtn && review.status !== 'deleted'" size="small" type="danger" plain @click="emit('delete', review.id)">删除评价</el-button>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;
@use '@/assets/styles/mixins' as *;

.review-card {
  padding: $spacing-lg 0;
  border-bottom: 1px solid $color-border;

  &:last-child {
    border-bottom: none;
  }
}

.review-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.review-header-right {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  flex-shrink: 0;
}

.reviewer-info {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  cursor: pointer;
  transition: opacity $transition-fast;

  &:hover {
    opacity: 0.8;
  }
}

.reviewer-meta {
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
}

.reviewer-name-row {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
}

.reviewer-name {
  font-size: $font-size-body;
  font-weight: $font-weight-medium;
  color: $color-text-primary;
}

.role-tag {
  font-size: $font-size-tiny;
  padding: 0 4px;
  height: 18px;
  line-height: 18px;
}

.review-time {
  font-size: $font-size-small;
  color: $color-text-placeholder;
}

.review-content {
  margin-top: $spacing-sm;
  font-size: $font-size-body;
  color: $color-text-primary;
  line-height: $line-height-normal;
  white-space: pre-wrap;
}

.review-images {
  display: flex;
  gap: $spacing-sm;
  margin-top: $spacing-sm;
}

.review-image {
  width: 80px;
  height: 80px;
  border-radius: $radius-sm;
  cursor: pointer;
}

.append-section {
  margin-top: $spacing-md;
  padding: $spacing-sm $spacing-md;
  background: $color-bg-page;
  border-radius: $radius-md;
}

.append-header {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  margin-bottom: $spacing-xs;
}

.append-time {
  font-size: $font-size-small;
  color: $color-text-placeholder;
}

.append-content {
  font-size: $font-size-body;
  color: $color-text-secondary;
  line-height: $line-height-normal;
  white-space: pre-wrap;
}

.review-actions {
  display: flex;
  gap: $spacing-xs;
  margin-top: $spacing-sm;
}

// 卖家回复
.seller-reply {
  margin-top: $spacing-sm;
  margin-left: 48px;
  padding: $spacing-sm $spacing-md;
  background: $color-bg-page;
  border-radius: $radius-md;
  border-left: 3px solid $color-warning;
}

.seller-reply-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.seller-reply-user {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  cursor: pointer;
  transition: opacity $transition-fast;

  &:hover {
    opacity: 0.8;
  }
}

.seller-reply-name {
  font-size: $font-size-small;
  font-weight: $font-weight-medium;
  color: $color-text-primary;
}

.seller-reply-content {
  margin-top: $spacing-xs;
  font-size: $font-size-small;
  color: $color-text-secondary;
  line-height: $line-height-normal;
  white-space: pre-wrap;
}

// 卖家追评
.seller-append {
  margin-top: $spacing-sm;
  padding-top: $spacing-sm;
  border-top: 1px dashed $color-border;
}

.seller-append-header {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  margin-bottom: $spacing-xs;
}

.seller-append-content {
  font-size: $font-size-small;
  color: $color-text-secondary;
  line-height: $line-height-normal;
  white-space: pre-wrap;
}

.order-info-row {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  padding: $spacing-sm;
  background: $color-bg-page;
  border-radius: $radius-md;
  margin-bottom: $spacing-sm;
  cursor: pointer;
  transition: background $transition-fast;

  &:hover {
    background: darken($color-bg-page, 3%);
  }
}

.order-product-image {
  width: 40px;
  height: 40px;
  border-radius: $radius-sm;
  object-fit: cover;
  flex-shrink: 0;
}

.order-product-detail {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.order-product-name {
  font-size: $font-size-body;
  color: $color-text-primary;
  @include text-ellipsis(1);
}

.order-no-small {
  font-size: $font-size-tiny;
  color: $color-text-placeholder;
}
</style>