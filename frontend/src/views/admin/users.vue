<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import { Search, Lock, Unlock } from '@element-plus/icons-vue'
import api from '@/api'
import { formatDate } from '@/utils/format'
import { getOssUrl } from '@/utils/oss'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

type UserRole = 'user' | 'admin' | 'super_admin'

const ROLE_LABELS: Record<UserRole, string> = {
  user: '用户',
  admin: '管理员',
  super_admin: '超级管理员',
}

const ROLE_TAG_TYPES: Record<UserRole, string> = {
  user: 'info',
  admin: 'warning',
  super_admin: 'danger',
}

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
  const isAdmin = user.role === 'admin'
  const action = isAdmin ? '取消管理员' : '设为管理员'
  try {
    await ElMessageBox.confirm(`确认${action}用户 "${user.username}"？`, '角色变更确认', {
      type: 'warning',
    })
  } catch {
    return
  }
  try {
    const newRole = isAdmin ? 'user' : 'admin'
    await api.put(`/users/admin/${user.id}/role`, { role: newRole })
    ElMessage.success(isAdmin ? '已取消管理员身份' : '已设为管理员')
    fetchUsers()
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || '操作失败')
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
              <el-avatar :size="32" :src="getOssUrl(row.avatar)">
                {{ row.username?.charAt(0) }}
              </el-avatar>
              <span>{{ row.username }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="email" label="邮箱" min-width="180" />
        <el-table-column prop="role" label="角色" width="100">
          <template #default="{ row }">
            <el-tag :type="ROLE_TAG_TYPES[(row as User).role] || 'info'" size="small">
              {{ ROLE_LABELS[(row as User).role] || row.role }}
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
        <el-table-column prop="createdAt" label="注册时间" width="160">
          <template #default="{ row }: { row: User }">
            {{ formatDate(row.createdAt, 'date') }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="userStore.isSuperAdmin && !row.isBlocked && row.role !== 'super_admin'"
              type="danger"
              text
              size="small"
              @click="handleBan(row)"
            >
              <el-icon><Lock /></el-icon>封禁
            </el-button>
            <el-button
              v-else-if="userStore.isSuperAdmin && row.role !== 'super_admin'"
              type="success"
              text
              size="small"
              @click="handleUnban(row)"
            >
              <el-icon><Unlock /></el-icon>解封
            </el-button>
            <el-button
              v-if="userStore.isSuperAdmin && row.role !== 'super_admin' && row.id !== userStore.user?.id"
              :type="row.role === 'admin' ? 'danger' : 'warning'"
              text
              size="small"
              @click="handleSetAdmin(row)"
            >
              {{ row.role === 'admin' ? '取消管理员' : '设为管理员' }}
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
