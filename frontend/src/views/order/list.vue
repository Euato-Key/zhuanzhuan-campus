<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowDown } from '@element-plus/icons-vue'
import type { OrderStatus, OrderListItem } from '@/api/modules/order'
import {
  getMyOrders,
  cancelOrder,
  confirmReceive,
  confirmPickup,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_TAG_TYPE,
} from '@/api/modules/order'
import { showError } from '@/utils/error'
import { formatDate } from '@/utils/format'
import { getOssUrl } from '@/utils/oss'
import AppLayout from '@/components/layout/AppLayout.vue'

const router = useRouter()

const loading = ref(false)
const orders = ref<OrderListItem[]>([])
const total = ref(0)

const queryParams = reactive({
  page: 1,
  pageSize: 10,
  status: '' as string,
  role: 'buyer' as 'buyer' | 'seller',
})

// 高频状态筛选
const mainStatusOptions: { label: string; value: string }[] = [
  { label: '全部', value: '' },
  { label: '待支付', value: 'pending_payment' },
  { label: '待发货', value: 'pending_ship' },
  { label: '待收货', value: 'pending_receive' },
  { label: '已完成', value: 'completed' },
]

// 低频状态
const moreStatusOptions: { label: string; value: OrderStatus }[] = [
  { label: '待自提', value: 'pending_pickup' },
  { label: '待确认自提', value: 'pending_confirm' },
  { label: '已取消', value: 'cancelled' },
  { label: '退货中', value: 'returning' },
  { label: '已退款', value: 'refunded' },
]

const isMoreStatus = computed(() =>
  moreStatusOptions.some((opt) => opt.value === queryParams.status),
)

const moreStatusLabel = computed(() => {
  if (!queryParams.status) return '更多'
  const found = moreStatusOptions.find((opt) => opt.value === queryParams.status)
  return found ? found.label : '更多'
})

async function fetchOrders() {
  loading.value = true
  try {
    const res = await getMyOrders({
      ...queryParams,
      status: queryParams.status || undefined,
    })
    if (res.data.code === 200) {
      orders.value = res.data.data.list
      total.value = res.data.data.total
    }
  } catch (err) {
    showError(err, '获取订单列表失败')
  } finally {
    loading.value = false
  }
}

function handleRoleChange() {
  queryParams.page = 1
  fetchOrders()
}

function handleStatusChange() {
  queryParams.page = 1
  fetchOrders()
}

function handleMoreStatus(status: OrderStatus) {
  queryParams.status = status
  queryParams.page = 1
  fetchOrders()
}

function clearStatusFilter() {
  queryParams.status = ''
  queryParams.page = 1
  fetchOrders()
}

function handlePageChange(page: number) {
  queryParams.page = page
  fetchOrders()
}

function goToDetail(order: OrderListItem) {
  router.push({ name: 'OrderDetail', params: { id: order.id } })
}

function getOtherUser(order: OrderListItem) {
  return queryParams.role === 'buyer' ? order.seller : order.buyer
}

// 判断订单是否可操作
function getActions(order: OrderListItem) {
  const actions: { label: string; type: 'primary' | 'warning' | 'danger' | 'default'; action: () => void }[] = []
  const isBuyer = queryParams.role === 'buyer'

  if (isBuyer) {
    if (order.status === 'pending_payment') {
      actions.push({ label: '去支付', type: 'primary', action: () => goToDetail(order) })
      actions.push({ label: '取消', type: 'default', action: () => handleCancel(order) })
    }
    if (order.status === 'pending_receive') {
      actions.push({ label: '确认收货', type: 'primary', action: () => handleConfirmReceive(order) })
    }
    if (order.status === 'pending_pickup' || order.status === 'pending_confirm') {
      actions.push({ label: '确认收货', type: 'primary', action: () => handleConfirmReceive(order) })
    }
    if (order.status === 'completed') {
      actions.push({ label: '评价', type: 'primary', action: () => goToDetail(order) })
      actions.push({ label: '申请退货', type: 'default', action: () => goToDetail(order) })
    }
  } else {
    if (order.status === 'pending_ship') {
      actions.push({ label: '去发货', type: 'primary', action: () => goToDetail(order) })
    }
    if (order.status === 'pending_pickup') {
      actions.push({ label: '确认取货', type: 'primary', action: () => handleConfirmPickup(order) })
    }
    if (order.status === 'returning') {
      actions.push({ label: '处理退货', type: 'warning', action: () => goToDetail(order) })
    }
  }

  return actions
}

async function handleCancel(order: OrderListItem) {
  try {
    await ElMessageBox.confirm('确定要取消该订单吗？', '提示', { type: 'warning' })
    await cancelOrder(order.id)
    ElMessage.success('订单已取消')
    fetchOrders()
  } catch (err: any) {
    if (err !== 'cancel') {
      showError(err, '取消订单失败')
    }
  }
}

async function handleConfirmReceive(order: OrderListItem) {
  try {
    await ElMessageBox.confirm('确认已收到商品？', '确认收货', { type: 'info' })
    await confirmReceive(order.id)
    ElMessage.success('已确认收货')
    fetchOrders()
  } catch (err: any) {
    if (err !== 'cancel') {
      showError(err, '确认收货失败')
    }
  }
}

async function handleConfirmPickup(order: OrderListItem) {
  try {
    await ElMessageBox.confirm('确认买家已取货？', '确认取货', { type: 'info' })
    await confirmPickup(order.id)
    ElMessage.success('已确认取货')
    fetchOrders()
  } catch (err: any) {
    if (err !== 'cancel') {
      showError(err, '确认取货失败')
    }
  }
}

onMounted(() => {
  fetchOrders()
})
</script>

<template>
  <AppLayout>
    <div class="orders-page">
      <!-- 角色切换 Tab -->
      <div class="role-tabs">
        <div
          class="role-tab"
          :class="{ active: queryParams.role === 'buyer' }"
          @click="queryParams.role = 'buyer'; handleRoleChange()"
        >
          我买到的
        </div>
        <div
          class="role-tab"
          :class="{ active: queryParams.role === 'seller' }"
          @click="queryParams.role = 'seller'; handleRoleChange()"
        >
          我卖出的
        </div>
      </div>

      <!-- 状态筛选 -->
      <div class="filter-bar">
        <el-radio-group v-model="queryParams.status" @change="handleStatusChange" size="small">
          <el-radio-button
            v-for="opt in mainStatusOptions"
            :key="String(opt.value)"
            :value="opt.value"
          >
            {{ opt.label }}
          </el-radio-button>
        </el-radio-group>
        <el-dropdown trigger="click" @command="handleMoreStatus">
          <el-button
            size="small"
            :type="isMoreStatus ? 'primary' : 'default'"
            plain
          >
            {{ moreStatusLabel }}
            <el-icon class="el-icon--right"><ArrowDown /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item
                v-for="opt in moreStatusOptions"
                :key="opt.value"
                :command="opt.value"
              >
                {{ opt.label }}
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-button
          v-if="queryParams.status"
          size="small"
          text
          type="info"
          @click="clearStatusFilter"
        >
          清除筛选
        </el-button>
      </div>

      <!-- 订单列表 -->
      <div class="order-list" v-loading="loading">
        <div
          v-for="order in orders"
          :key="order.id"
          class="order-card"
        >
          <!-- 订单头部 -->
          <div class="order-header" @click="goToDetail(order)">
            <div class="order-info">
              <span class="order-no">{{ order.orderNo }}</span>
              <span class="order-time">{{ formatDate(order.createdAt, 'full') }}</span>
            </div>
            <el-tag :type="ORDER_STATUS_TAG_TYPE[order.status]" size="small">
              {{ ORDER_STATUS_LABELS[order.status] }}
            </el-tag>
          </div>

          <!-- 商品信息 -->
          <div class="order-body" @click="goToDetail(order)">
            <img
              :src="order.productImage || order.product?.images?.[0] || '/placeholder.png'"
              alt="商品图片"
              class="product-image"
            />
            <div class="product-info">
              <h3 class="product-name">{{ order.productName || order.product?.name }}</h3>
              <div class="product-meta">
                <span class="quantity">× {{ order.quantity }}</span>
                <span class="price">¥{{ order.price }}</span>
              </div>
            </div>
            <div class="order-total">
              <span class="label">实付款</span>
              <span class="value">¥{{ order.totalPrice }}</span>
            </div>
          </div>

          <!-- 底部：对方用户 + 操作 -->
          <div class="order-footer">
            <div class="user-info">
              <el-avatar :size="24" :src="getOssUrl(getOtherUser(order)?.avatar)">
                {{ getOtherUser(order)?.username?.charAt(0) }}
              </el-avatar>
              <span class="username">{{ getOtherUser(order)?.username }}</span>
              <span class="role-tag">{{ queryParams.role === 'buyer' ? '卖家' : '买家' }}</span>
            </div>
            <div class="order-actions" v-if="getActions(order).length > 0">
              <el-button
                v-for="(act, idx) in getActions(order)"
                :key="idx"
                :type="act.type"
                size="small"
                plain
                @click.stop="act.action"
              >
                {{ act.label }}
              </el-button>
            </div>
          </div>
        </div>

        <el-empty v-if="!loading && orders.length === 0" description="暂无订单" />
      </div>

      <!-- 分页 -->
      <div class="pagination-wrap" v-if="total > queryParams.pageSize">
        <el-pagination
          background
          layout="total, prev, pager, next"
          :total="total"
          :page-size="queryParams.pageSize"
          :current-page="queryParams.page"
          @current-change="handlePageChange"
        />
      </div>
    </div>
  </AppLayout>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.orders-page {
  max-width: $container-lg;
  margin: 0 auto;
  padding: $spacing-lg;
}

// 角色切换 Tab
.role-tabs {
  display: flex;
  gap: 0;
  margin-bottom: $spacing-lg;
  border-bottom: 2px solid $color-border-light;

  .role-tab {
    padding: $spacing-sm $spacing-lg;
    font-size: $font-size-body;
    font-weight: $font-weight-medium;
    color: $color-text-secondary;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    margin-bottom: -2px;
    transition: all $transition-fast;

    &:hover {
      color: $color-primary;
    }

    &.active {
      color: $color-primary;
      border-bottom-color: $color-primary;
    }
  }
}

// 状态筛选
.filter-bar {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  margin-bottom: $spacing-lg;
  flex-wrap: wrap;
}

.order-list {
  min-height: 300px;
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
}

.order-card {
  background: $color-bg-card;
  border-radius: $radius-lg;
  box-shadow: $shadow-sm;
  transition: box-shadow $transition-fast;
  overflow: hidden;

  &:hover {
    box-shadow: $shadow-md;
  }
}

.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: $spacing-md $spacing-lg;
  border-bottom: 1px solid $color-border-light;
  cursor: pointer;
}

.order-info {
  display: flex;
  gap: $spacing-lg;
}

.order-no {
  font-size: $font-size-small;
  color: $color-text-secondary;
  font-family: $font-family-mono;
}

.order-time {
  font-size: $font-size-small;
  color: $color-text-placeholder;
}

.order-body {
  display: flex;
  align-items: center;
  gap: $spacing-md;
  padding: $spacing-lg;
  cursor: pointer;
}

.product-image {
  width: 80px;
  height: 80px;
  border-radius: $radius-md;
  object-fit: cover;
  flex-shrink: 0;
}

.product-info {
  flex: 1;
  min-width: 0;
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
  gap: $spacing-md;
  font-size: $font-size-small;
  color: $color-text-secondary;
}

.price {
  color: $color-error;
  font-weight: $font-weight-medium;
}

.order-total {
  text-align: right;
  flex-shrink: 0;

  .label {
    font-size: $font-size-small;
    color: $color-text-secondary;
    margin-right: $spacing-xs;
  }

  .value {
    font-size: $font-size-h3;
    font-weight: $font-weight-bold;
    color: $color-error;
  }
}

.order-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: $spacing-md $spacing-lg;
  border-top: 1px solid $color-border-light;
}

.user-info {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
}

.username {
  font-size: $font-size-small;
  color: $color-text-primary;
}

.role-tag {
  font-size: $font-size-tiny;
  color: $color-text-placeholder;
}

.order-actions {
  display: flex;
  gap: $spacing-xs;
}

.pagination-wrap {
  display: flex;
  justify-content: center;
  margin-top: $spacing-xl;
}

@media (max-width: $breakpoint-sm) {
  .order-body {
    flex-direction: column;
    align-items: flex-start;
  }

  .product-image {
    width: 100%;
    height: 150px;
  }

  .order-total {
    width: 100%;
    text-align: left;
    margin-top: $spacing-sm;
  }

  .order-footer {
    flex-direction: column;
    align-items: flex-start;
    gap: $spacing-sm;
  }
}
</style>