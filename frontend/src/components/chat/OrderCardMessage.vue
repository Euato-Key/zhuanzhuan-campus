<script setup lang="ts">
import type { OrderCardContent } from '@/api/modules/chat'

defineProps<{
  content: OrderCardContent
}>()

const statusLabels: Record<string, string> = {
  pending_payment: '待付款',
  paid: '已付款',
  shipped: '已发货',
  delivered: '已收货',
  completed: '已完成',
  cancelled: '已取消',
  refunding: '退款中',
  refunded: '已退款',
}
</script>

<template>
  <router-link :to="`/orders/${content.orderId}`" class="order-card-msg">
    <div class="order-header">
      <span class="order-no">订单号: {{ content.orderNo }}</span>
      <el-tag size="small" :type="content.status === 'completed' ? 'success' : 'info'">
        {{ statusLabels[content.status] || content.status }}
      </el-tag>
    </div>
    <div class="order-body">
      <span class="product-name">{{ content.productName }}</span>
      <span class="card-link">查看订单</span>
    </div>
  </router-link>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;
@use '@/assets/styles/mixins' as *;

.order-card-msg {
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
  padding: $spacing-sm $spacing-md;
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

.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.order-no {
  font-size: $font-size-small;
  color: $color-text-secondary;
}

.order-body {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.product-name {
  font-size: $font-size-body;
  color: $color-text-primary;
  @include text-ellipsis(1);
  flex: 1;
  margin-right: $spacing-sm;
}

.card-link {
  font-size: $font-size-small;
  color: $color-primary;
  white-space: nowrap;
}
</style>