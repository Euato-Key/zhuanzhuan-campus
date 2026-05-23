<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import { Search, UserFilled, Lock, Unlock } from '@element-plus/icons-vue'
import api from '@/api'

type UserRole = 'user' | 'admin'

interface User {
  id: number
  username: string
  email: string
  role: UserRole
  isBlocked: boolean
  creditScore: number
  createdAt: string
  avatar: string | null
}

const loading = ref(false)
const searchQuery = ref('')
const statusFilter = ref('')
const users = ref<User[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)

onMounted(() => {
  fetchUsers()
})

watch([currentPage, statusFilter], () => {
  fetchUsers()
})

async function fetchUsers() {
  loading.value = true
  try {
    const params: Record<string, any> = {
      page: currentPage.value,
      pageSize: pageSize.value,
    }
    if (searchQuery.value) params.keyword = searchQuery.value
    if (statusFilter.value) params.status = statusFilter.value

    const res = await api.get('/users/admin/list', { params })
    const data = res.data.data
    users.value = data.list.map((u: any) => ({
      ...u,
      status: u.isBlocked ? 'banned' : 'active',
    }))
    total.value = data.total
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || '获取用户列表失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  currentPage.value = 1
  fetchUsers()
}

async function handleBan(user: User) {
  try {
    await ElMessageBox.confirm(`确认封禁用户 "${user.username}"？封禁后将无法登录和使用平台功能。`, '封禁确认', {
      type: 'warning',
    })
  } catch {
    return
  }
  try {
    await api.put(`/users/admin/${user.id}/ban`)
    ElMessage.success('封禁成功')
    fetchUsers()
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || '封禁失败')
  }
}

async function handleUnban(user: User) {
  try {
    await api.put(`/users/admin/${user.id}/unban`)
    ElMessage.success('解封成功')
    fetchUsers()
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || '解封失败')
  }
}

async function handleSetAdmin(user: User) {
  try {
    await ElMessageBox.confirm(`确认将用户 "${user.username}" 设为管理员？`, '角色变更确认', {
      type: 'warning',
    })
  } catch {
    return
  }
  try {
    await api.put(`/users/admin/${user.id}/role`, { role: 'admin' })
    ElMessage.success('已设为管理员')
    fetchUsers()
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || '设置失败')
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

      <el-empty v-if="!loading && users.length === 0" description="暂无用户数据" />

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
