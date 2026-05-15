<script setup lang="ts">
import { ref } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import { Search, Check, Close, View } from '@element-plus/icons-vue'

const loading = ref(false)
const searchQuery = ref('')
const statusFilter = ref('')

// Mock data
const products = ref([
  { id: 1, name: '二手自行车', seller: '张三', category: '生活用品', price: 150, status: 'pending', createdAt: '2024-03-15' },
  { id: 2, name: 'iPhone 13 Pro', seller: '李四', category: '电子产品', price: 4500, status: 'pending', createdAt: '2024-03-14' },
  { id: 3, name: '教材高等数学', seller: '王五', category: '书籍', price: 30, status: 'approved', createdAt: '2024-03-13' },
  { id: 4, name: 'Nike运动鞋', seller: '赵六', category: '服饰鞋包', price: 200, status: 'rejected', createdAt: '2024-03-12' },
])

function handleApprove(product: any) {
  console.log('Approve:', product)
}

function handleReject(product: any) {
  console.log('Reject:', product)
}

function handleView(product: any) {
  console.log('View:', product)
}
</script>

<template>
  <AdminLayout>
    <!-- Header -->
    <div class="page-header">
      <div class="header-actions">
        <el-input
          v-model="searchQuery"
          placeholder="搜索商品名称"
          :prefix-icon="Search"
          clearable
          style="width: 300px"
        />
        <el-select v-model="statusFilter" placeholder="状态筛选" clearable style="width: 120px">
          <el-option label="待审核" value="pending" />
          <el-option label="已通过" value="approved" />
          <el-option label="已拒绝" value="rejected" />
        </el-select>
      </div>
    </div>

    <!-- Table -->
    <div class="card">
      <el-table :data="products" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="商品名称" min-width="150" />
        <el-table-column prop="seller" label="卖家" width="100" />
        <el-table-column prop="category" label="分类" width="100" />
        <el-table-column prop="price" label="价格" width="100">
          <template #default="{ row }">
            ¥{{ row.price }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag
              :type="row.status === 'pending' ? 'warning' : row.status === 'approved' ? 'success' : 'danger'"
              size="small"
            >
              {{ row.status === 'pending' ? '待审核' : row.status === 'approved' ? '已通过' : '已拒绝' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="提交时间" width="120" />
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" text size="small" @click="handleView(row)">
              <el-icon><View /></el-icon>查看
            </el-button>
            <el-button
              v-if="row.status === 'pending'"
              type="success"
              text
              size="small"
              @click="handleApprove(row)"
            >
              <el-icon><Check /></el-icon>通过
            </el-button>
            <el-button
              v-if="row.status === 'pending'"
              type="danger"
              text
              size="small"
              @click="handleReject(row)"
            >
              <el-icon><Close /></el-icon>拒绝
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