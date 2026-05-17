<script setup lang="ts">
import { ref, watch } from 'vue'
import { getMyOrders, type OrderListItem, ORDER_STATUS_LABELS, ORDER_STATUS_TAG_TYPE } from '@/api/modules/order'
import { showError } from '@/utils/error'

const props = defineProps<{
  visible: boolean
  otherUserId: number
}>()

const emit = defineEmits<{
  'update:visible': [val: boolean]
  select: [orderId: string]
}>()

const orders = ref<OrderListItem[]>([])
const loading = ref(false)

async function loadOrders() {
  loading.value = true
  try {
    const [buyerRes, sellerRes] = await Promise.all([
      getMyOrders({ page: 1, pageSize: 50, role: 'buyer' }),
      getMyOrders({ page: 1, pageSize: 50, role: 'seller' }),
    ])
    const allOrders: OrderListItem[] = []
    if (buyerRes.data.code === 200) allOrders.push(...buyerRes.data.data.list)
    if (sellerRes.data.code === 200) allOrders.push(...sellerRes.data.data.list)
    // Deduplicate by id
    const seen = new Set<string>()
    orders.value = allOrders.filter(o => {
      if (seen.has(o.id)) return false
      seen.add(o.id)
      return o.buyerId === props.otherUserId || o.sellerId === props.otherUserId
    })
  } catch (err) {
    showError(err, '获取订单列表失败')
  } finally {
    loading.value = false
  }
}

function handleSelect(orderId: string) {
  emit('select', orderId)
  emit('update:visible', false)
}

watch(() => props.visible, (val) => {
  if (val) loadOrders()
})
</script>

<template>
  <el-dialog
    :model-value="visible"
    title="选择订单"
    width="480px"
    @update:model-value="$emit('update:visible', $event)"
  >
    <div v-loading="loading" class="picker-list">
      <el-empty v-if="!loading && !orders.length" description="暂无相关订单" :image-size="60" />
      <div v-for="item in orders" :key="item.id" class="picker-item">
        <div class="picker-info">
          <span class="picker-name">{{ item.productName }}</span>
          <div class="picker-meta">
            <span class="picker-order-no">{{ item.orderNo }}</span>
            <el-tag size="small" :type="ORDER_STATUS_TAG_TYPE[item.status]">
              {{ ORDER_STATUS_LABELS[item.status] }}
            </el-tag>
          </div>
        </div>
        <span class="picker-price">¥{{ item.totalPrice }}</span>
        <el-button size="small" type="primary" plain @click="handleSelect(item.id)">选择</el-button>
      </div>
    </div>
  </el-dialog>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.picker-list {
  min-height: 120px;
  max-height: 400px;
  overflow-y: auto;
}

.picker-item {
  display: flex;
  align-items: center;
  gap: $spacing-md;
  padding: $spacing-sm 0;

  & + & {
    border-top: 1px solid $color-border-light;
  }
}

.picker-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
}

.picker-name {
  font-size: $font-size-body;
  color: $color-text-primary;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.picker-meta {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
}

.picker-order-no {
  font-size: $font-size-tiny;
  color: $color-text-placeholder;
}

.picker-price {
  font-size: $font-size-small;
  color: $color-primary;
  font-weight: $font-weight-medium;
  flex-shrink: 0;
}
</style>