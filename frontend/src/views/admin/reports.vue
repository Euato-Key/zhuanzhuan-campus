<script setup lang="ts">
import { ref } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import { Search, Check, Close } from '@element-plus/icons-vue'

const loading = ref(false)
const typeFilter = ref('')
const statusFilter = ref('')

// Mock data
const reports = ref([
  { id: 1, type: 'product', target: '二手自行车', reporter: '张三', reason: '虚假商品', status: 'pending', createdAt: '2024-03-15' },
  { id: 2, type: 'user', target: '李四', reporter: '王五', reason: '欺诈行为', status: 'processing', createdAt: '2024-03-14' },
  { id: 3, type: 'comment', target: '评论内容...', reporter: '赵六', reason: '辱骂言论', status: 'resolved', createdAt: '2024-03-13' },
  { id: 4, type: 'wantbuy', target: '求购iPhone', reporter: '钱七', reason: '虚假求购', status: 'closed', createdAt: '2024-03-12' },
])

const typeMap: Record<string, { label: string; type: string }> = {
  product: { label: '商品举报', type: 'primary' },
  user: { label: '用户举报', type: 'warning' },
  comment: { label: '评论举报', type: 'info' },
  wantbuy: { label: '求购举报', type: 'success' },
}

const statusMap: Record<string, { label: string; type: string }> = {
  pending: { label: '待处理', type: 'warning' },
  processing: { label: '处理中', type: 'primary' },
  resolved: { label: '已处理', type: 'success' },
  closed: { label: '已关闭', type: 'info' },
}

function handleApprove(report: any) {
  console.log('Approve report:', report)
}

function handleReject(report: any) {
  console.log('Reject report:', report)
}
</script>

<template>
  <AdminLayout>
    <!-- Header -->
    <div class="page-header">
      <div class="header-actions">
        <el-input
          placeholder="搜索举报内容"
          :prefix-icon="Search"
          clearable
          style="width: 300px"
        />
        <el-select v-model="typeFilter" placeholder="举报类型" clearable style="width: 120px">
          <el-option label="商品举报" value="product" />
          <el-option label="用户举报" value="user" />
          <el-option label="评论举报" value="comment" />
          <el-option label="求购举报" value="wantbuy" />
        </el-select>
        <el-select v-model="statusFilter" placeholder="处理状态" clearable style="width: 120px">
          <el-option label="待处理" value="pending" />
          <el-option label="处理中" value="processing" />
          <el-option label="已处理" value="resolved" />
          <el-option label="已关闭" value="closed" />
        </el-select>
      </div>
    </div>

    <!-- Table -->
    <div class="card">
      <el-table :data="reports" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="type" label="举报类型" width="120">
          <template #default="{ row }">
            <el-tag :type="typeMap[row.type]?.type" size="small">
              {{ typeMap[row.type]?.label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="target" label="举报对象" min-width="150" />
        <el-table-column prop="reporter" label="举报人" width="100" />
        <el-table-column prop="reason" label="举报理由" min-width="150" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusMap[row.status]?.type" size="small">
              {{ statusMap[row.status]?.label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="举报时间" width="120" />
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
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
              <el-icon><Close /></el-icon>驳回
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