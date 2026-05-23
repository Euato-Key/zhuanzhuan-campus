<script setup lang="ts">
import { formatDate } from '@/utils/format'
import { useRouter } from 'vue-router'

const props = defineProps<{ orders: any[] }>()
const router = useRouter()

const ORDER_STATUS_LABELS: Record<string, string> = {
  'pending_payment': '待支付', 'pending_ship': '待发货', 'pending_pickup': '待自提',
  'pending_receive': '待收货', 'pending_confirm': '待确认自提', 'completed': '已完成',
  'cancelled': '已取消', 'returning': '退货中', 'refunded': '已退款',
}

function go(id: number) { router.push({ name: 'OrderDetail', params: { id } }) }
</script>

<template>
  <div class="card-list">
    <div v-for="(o, idx) in orders" :key="o?.orderNo || idx" class="mini-card" @click="go(o?.id)">
      <div class="mini-card-info">
        <div class="mini-card-name">{{ o?.productName }}</div>
        <div class="mini-card-date">{{ formatDate(o?.createdAt, 'date') }}</div>
        <div class="mini-card-price">¥{{ o?.totalPrice }}</div>
      </div>
      <div class="mini-card-tags">
        <el-tag v-if="o?.type" size="small" :type="o.type === '卖出' ? 'danger' : 'success'">{{ o.type }}</el-tag>
        <el-tag size="small" type="info">{{ ORDER_STATUS_LABELS[o?.status] || o?.status }}</el-tag>
      </div>
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
.mini-card-info { flex: 1; min-width: 0; }
.mini-card-name { font-size: $font-size-body; color: $color-text-primary; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mini-card-date { font-size: $font-size-tiny; color: $color-text-placeholder; margin: 2px 0; }
.mini-card-price { font-size: $font-size-body; font-weight: $font-weight-semibold; color: $color-error; }
.mini-card-tags { display: flex; gap: 4px; flex-shrink: 0; }
</style>