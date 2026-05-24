<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import { Search, View } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import api from '@/api'
import { formatDate } from '@/utils/format'
import { getOssUrl } from '@/utils/oss'

type OrderStatus = 'pending_payment' | 'pending_ship' | 'pending_pickup' | 'pending_receive' | 'pending_confirm' | 'completed' | 'cancelled' | 'returning' | 'refunded'

interface Order {
  id: string
  orderNo: string
  buyer: string
  seller: string
  product: string
  productImage: string | null
  amount: number
  status: OrderStatus
  createdAt: string
}

const router = useRouter()
const loading = ref(false)
const statusFilter = ref('')
const searchKeyword = ref('')
const orders = ref<Order[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)

const statusMap: Record<OrderStatus, { label: string; type: string }> = {
  pending_payment: { label: '待支付', type: 'warning' },
  pending_ship: { label: '待发货', type: 'primary' },
  pending_pickup: { label: '待自提', type: 'primary' },
  pending_receive: { label: '待收货', type: 'info' },
  pending_confirm: { label: '待确认', type: 'info' },
  completed: { label: '已完成', type: 'success' },
  cancelled: { label: '已取消', type: 'danger' },
  returning: { label: '退货中', type: 'warning' },
  refunded: { label: '已退款', type: 'info' },
}

onMounted(() => {
  fetchOrders()
})

watch([currentPage, statusFilter], () => {
  fetchOrders()
})

async function fetchOrders() {
  loading.value = true
  try {
    const params: Record<string, any> = {
      page: currentPage.value,
      pageSize: pageSize.value,
    }
    if (statusFilter.value) params.status = statusFilter.value
    if (searchKeyword.value) params.keyword = searchKeyword.value

    const res = await api.get('/orders/admin/list', { params })
    const data = res.data.data
    orders.value = data.list
    total.value = data.total
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || '获取订单列表失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  currentPage.value = 1
  fetchOrders()
}

async function handleView(order: Order) {
  try {
    const res = await api.get(`/orders/admin/${order.id}`)
    const detail = res.data.data
    ElMessageBox.alert(
      `订单号：${detail.orderNo}\n商品：${detail.productName}\n买家：${detail.buyer?.username}\n卖家：${detail.seller?.username}\n金额：¥${Number(detail.totalPrice)}\n状态：${statusMap[detail.status as OrderStatus]?.label || detail.status}\n创建时间：${formatDate(detail.createdAt)}`,
      '订单详情',
      { confirmButtonText: '关闭' }
    )
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || '获取订单详情失败')
  }
}

function handlePageChange(page: number) {
  currentPage.value = page
}
</script>

<template>
  <AdminLayout>
    <!-- Header -->
    <div class="page-header">
      <div class="header-actions">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索订单号"
          :prefix-icon="Search"
          clearable
          style="width: 300px"
          @keyup.enter="handleSearch"
        />
        <el-select v-model="statusFilter" placeholder="状态筛选" clearable style="width: 140px">
          <el-option label="待支付" value="pending_payment" />
          <el-option label="待发货" value="pending_ship" />
          <el-option label="待自提" value="pending_pickup" />
          <el-option label="待收货" value="pending_receive" />
          <el-option label="已完成" value="completed" />
          <el-option label="已取消" value="cancelled" />
          <el-option label="退货中" value="returning" />
        </el-select>
      </div>
    </div>

    <!-- Table -->
    <div class="card">
      <el-table :data="orders" v-loading="loading" stripe>
        <el-table-column prop="orderNo" label="订单号" width="200" />
        <el-table-column label="商品" min-width="150">
          <template #default="{ row }">
            <div class="product-cell">
              <img v-if="row.productImage" :src="getOssUrl(row.productImage)" class="product-thumb" />
              <span class="product-name-text">{{ row.product }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="buyer" label="买家" width="100" />
        <el-table-column prop="seller" label="卖家" width="100" />
        <el-table-column prop="amount" label="金额" width="100">
          <template #default="{ row }">
            ¥{{ row.amount }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }: { row: Order }">
            <el-tag :type="statusMap[row.status]?.type" size="small">
              {{ statusMap[row.status]?.label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" text size="small" @click="handleView(row)">
              <el-icon><View /></el-icon>查看
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="!loading && orders.length === 0" description="暂无订单数据" />

      <div class="pagination-wrap" v-if="total > 0">
        <el-pagination
          background
          layout="total, prev, pager, next"
          :total="total"
          :page-size="pageSize"
          :current-page="currentPage"
          @current-change="handlePageChange"
        />
      </div>
    </div>
  </AdminLayout>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.page-header {
  margin-bottom: 24px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.card {
  background: #fff;
  border-radius: $radius-lg;
  padding: 24px;
  box-shadow: $shadow-sm;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

.product-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.product-thumb {
  width: 36px;
  height: 36px;
  border-radius: 4px;
  object-fit: cover;
  flex-shrink: 0;
}

.product-name-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>