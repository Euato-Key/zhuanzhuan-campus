<script setup lang="ts">
import { ref } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import { Plus, Edit, Delete, Top } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

interface Banner {
  id: number
  title: string
  imageUrl: string
  linkUrl: string
  sort: number
  status: 'active' | 'inactive'
  startTime: string
  endTime: string
}

const loading = ref(false)

// Mock data
const banners = ref<Banner[]>([
  { id: 1, title: '开学季特惠', imageUrl: '', linkUrl: '/products?category=1', sort: 1, status: 'active', startTime: '2024-03-01', endTime: '2024-03-31' },
  { id: 2, title: '二手书籍专区', imageUrl: '', linkUrl: '/products?category=2', sort: 2, status: 'active', startTime: '2024-03-01', endTime: '2024-04-30' },
  { id: 3, title: '电子产品专场', imageUrl: '', linkUrl: '/products?category=3', sort: 3, status: 'inactive', startTime: '2024-02-01', endTime: '2024-02-28' },
])

const dialogVisible = ref(false)
const dialogTitle = ref('添加Banner')
const formData = ref({
  id: 0,
  title: '',
  imageUrl: '',
  linkUrl: '',
  sort: 1,
  status: 'active' as 'active' | 'inactive',
  startTime: '',
  endTime: '',
})

function handleAdd() {
  dialogTitle.value = '添加Banner'
  formData.value = { id: 0, title: '', imageUrl: '', linkUrl: '', sort: 1, status: 'active', startTime: '', endTime: '' }
  dialogVisible.value = true
}

function handleEdit(banner: Banner) {
  dialogTitle.value = '编辑Banner'
  formData.value = { ...banner }
  dialogVisible.value = true
}

function handleDelete(banner: Banner) {
  ElMessageBox.confirm(
    `确定要删除Banner"${banner.title}"吗？`,
    '提示',
    { type: 'warning' }
  ).then(() => {
    ElMessage.success('删除成功')
  }).catch(() => {})
}

function handleToggleStatus(banner: Banner) {
  const action = banner.status === 'active' ? '禁用' : '启用'
  ElMessage.success(`已${action}`)
}

function handleSubmit() {
  ElMessage.success('保存成功')
  dialogVisible.value = false
}
</script>

<template>
  <AdminLayout>
    <!-- Header -->
    <div class="page-header">
      <el-button type="primary" @click="handleAdd">
        <el-icon><Plus /></el-icon>
        添加Banner
      </el-button>
    </div>

    <!-- Table -->
    <div class="card">
      <el-table :data="banners" v-loading="loading" stripe>
        <el-table-column prop="sort" label="排序" width="80">
          <template #default="{ row }">
            <el-icon class="sort-icon"><Top /></el-icon>
            {{ row.sort }}
          </template>
        </el-table-column>
        <el-table-column prop="title" label="标题" min-width="150" />
        <el-table-column prop="imageUrl" label="图片" width="120">
          <template #default>
            <div class="image-placeholder">暂无图片</div>
          </template>
        </el-table-column>
        <el-table-column prop="linkUrl" label="跳转链接" min-width="150" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">
              {{ row.status === 'active' ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="有效期" width="200">
          <template #default="{ row }">
            {{ row.startTime }} ~ {{ row.endTime }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" text size="small" @click="handleEdit(row)">
              <el-icon><Edit /></el-icon>编辑
            </el-button>
            <el-button
              :type="row.status === 'active' ? 'warning' : 'success'"
              text
              size="small"
              @click="handleToggleStatus(row)"
            >
              {{ row.status === 'active' ? '禁用' : '启用' }}
            </el-button>
            <el-button type="danger" text size="small" @click="handleDelete(row)">
              <el-icon><Delete /></el-icon>删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- Dialog -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="500px">
      <el-form :model="formData" label-width="80px">
        <el-form-item label="标题" required>
          <el-input v-model="formData.title" placeholder="请输入Banner标题" />
        </el-form-item>
        <el-form-item label="图片" required>
          <el-input v-model="formData.imageUrl" placeholder="图片URL" />
        </el-form-item>
        <el-form-item label="跳转链接">
          <el-input v-model="formData.linkUrl" placeholder="点击跳转的链接" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="formData.sort" :min="1" :max="99" />
        </el-form-item>
        <el-form-item label="有效期">
          <el-date-picker
            v-model="formData.startTime"
            type="date"
            placeholder="开始日期"
            style="width: 45%"
          />
          <span style="margin: 0 8px">~</span>
          <el-date-picker
            v-model="formData.endTime"
            type="date"
            placeholder="结束日期"
            style="width: 45%"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch
            v-model="formData.status"
            active-value="active"
            inactive-value="inactive"
            active-text="启用"
            inactive-text="禁用"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </AdminLayout>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.page-header {
  margin-bottom: 24px;
  display: flex;
  justify-content: flex-end;
}

.card {
  background: #fff;
  border-radius: $radius-lg;
  padding: 24px;
  box-shadow: $shadow-sm;
}

.sort-icon {
  vertical-align: middle;
  margin-right: 4px;
  color: $color-text-placeholder;
}

.image-placeholder {
  width: 80px;
  height: 45px;
  background: $color-bg-page;
  border-radius: $radius-sm;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: $color-text-placeholder;
}
</style>