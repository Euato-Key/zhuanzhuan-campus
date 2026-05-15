<script setup lang="ts">
import { ref } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import { Search, View } from '@element-plus/icons-vue'

const loading = ref(false)
const statusFilter = ref('')

// Mock data
const orders = ref([
  { id: 'ORD001', buyer: '张三', seller: '李四', product: '二手自行车', amount: 150, status: 'pending_payment', createdAt: '2024-03-15 10:30' },
  { id: 'ORD002', buyer: '王五', seller: '赵六', product: 'iPhone 13', amount: 4500, status: 'pending_delivery', createdAt: '2024-03-14 14:20' },
  { id: 'ORD003', buyer: '钱七', seller: '张三', product: '教材高等数学', amount: 30, status: 'completed', createdAt: '2024-03-13 09:15' },
  { id: 'ORD004', buyer: '李四', seller: '王五', product: 'Nike运动鞋', amount: 200, status: 'cancelled', createdAt: '2024-03-12 16:45' },
])

const statusMap: Record<string, { label: string; type: string }> = {
  pending_payment: { label: '待支付', type: 'warning' },
  pending_delivery: { label: '待发货', type: 'primary' },
  pending_pickup: { label: '待自提', type: 'primary' },
  pending_receive: { label: '待收货', type: 'info' },
  completed: { label: '已完成', type: 'success' },
  cancelled: { label: '已取消', type: 'danger' },
  returning: { label: '退货中', type: 'warning' },
  refunded: { label: '已退款', type: 'info' },
}

function handleView(order: any) {
  console.log('View order:', order)
}
</script>

<template>
  <AdminLayout>
    <!-- Header -->
    <div class="page-header">
      <div class="header-actions">
        <el-input
          placeholder="搜索订单号"
          :prefix-icon="Search"
          clearable
          style="width: 300px"
        />
        <el-select v-model="statusFilter" placeholder="状态筛选" clearable style="width: 140px">
          <el-option label="待支付" value="pending_payment" />
          <el-option label="待发货" value="pending_delivery" />
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
        <el-table-column prop="id" label="订单号" width="120" />
        <el-table-column prop="product" label="商品" min-width="150" />
        <el-table-column prop="buyer" label="买家" width="100" />
        <el-table-column prop="seller" label="卖家" width="100" />
        <el-table-column prop="amount" label="金额" width="100">
          <template #default="{ row }">
            ¥{{ row.amount }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusMap[row.status]?.type" size="small">
              {{ statusMap[row.status]?.label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="160" />
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" text size="small" @click="handleView(row)">
              <el-icon><View /></el-icon>查看
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrap">
        <el-pagination
          background
          layout="total, prev, pager, next"
          :total="100"
          :page-size="10"
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
</style>