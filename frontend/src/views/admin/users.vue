<script setup lang="ts">
import { ref } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import { Search, UserFilled, Lock, Unlock } from '@element-plus/icons-vue'

const loading = ref(false)
const searchQuery = ref('')
const statusFilter = ref('')

// Mock data
const users = ref([
  { id: 1, username: '张三', email: 'zhangsan@example.com', role: 'user', status: 'active', creditScore: 100, createdAt: '2024-01-15' },
  { id: 2, username: '李四', email: 'lisi@example.com', role: 'user', status: 'active', creditScore: 95, createdAt: '2024-02-20' },
  { id: 3, username: '王五', email: 'wangwu@example.com', role: 'admin', status: 'active', creditScore: 100, createdAt: '2024-01-10' },
  { id: 4, username: '赵六', email: 'zhaoliu@example.com', role: 'user', status: 'banned', creditScore: 60, createdAt: '2024-03-01' },
])

function handleSearch() {
  // TODO: Implement search
}

function handleBan(user: any) {
  console.log('Ban user:', user)
}

function handleUnban(user: any) {
  console.log('Unban user:', user)
}

function handleSetAdmin(user: any) {
  console.log('Set admin:', user)
}
</script>

<template>
  <AdminLayout>
    <!-- Header -->
    <div class="page-header">
      <div class="header-actions">
        <el-input
          v-model="searchQuery"
          placeholder="搜索用户名或邮箱"
          :prefix-icon="Search"
          clearable
          style="width: 300px"
          @keyup.enter="handleSearch"
        />
        <el-select v-model="statusFilter" placeholder="状态筛选" clearable style="width: 120px">
          <el-option label="正常" value="active" />
          <el-option label="封禁" value="banned" />
        </el-select>
      </div>
    </div>

    <!-- Table -->
    <div class="card">
      <el-table :data="users" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="username" label="用户名" min-width="120">
          <template #default="{ row }">
            <div class="user-cell">
              <el-avatar :size="32" :icon="UserFilled" />
              <span>{{ row.username }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="email" label="邮箱" min-width="180" />
        <el-table-column prop="role" label="角色" width="100">
          <template #default="{ row }">
            <el-tag :type="row.role === 'admin' ? 'warning' : 'info'" size="small">
              {{ row.role === 'admin' ? '管理员' : '用户' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="creditScore" label="信用分" width="100" />
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'danger'" size="small">
              {{ row.status === 'active' ? '正常' : '封禁' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="注册时间" width="120" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 'active'"
              type="danger"
              text
              size="small"
              @click="handleBan(row)"
            >
              <el-icon><Lock /></el-icon>封禁
            </el-button>
            <el-button
              v-else
              type="success"
              text
              size="small"
              @click="handleUnban(row)"
            >
              <el-icon><Unlock /></el-icon>解封
            </el-button>
            <el-button
              v-if="row.role === 'user'"
              type="warning"
              text
              size="small"
              @click="handleSetAdmin(row)"
            >
              设为管理员
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

.user-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}
</style>
