<script setup lang="ts">
import { ref } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import { Plus, Edit, Delete } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

interface Category {
  id: number
  name: string
  parentId: number | null
  children?: Category[]
}

const loading = ref(false)

// Mock data
const categories = ref<Category[]>([
  { id: 1, name: '书籍', parentId: null, children: [
    { id: 11, name: '教材教辅', parentId: 1 },
    { id: 12, name: '小说文学', parentId: 1 },
    { id: 13, name: '专业书籍', parentId: 1 },
  ]},
  { id: 2, name: '电子产品', parentId: null, children: [
    { id: 21, name: '手机', parentId: 2 },
    { id: 22, name: '电脑', parentId: 2 },
    { id: 23, name: '数码配件', parentId: 2 },
  ]},
  { id: 3, name: '生活用品', parentId: null, children: [
    { id: 31, name: '日用品', parentId: 3 },
    { id: 32, name: '运动户外', parentId: 3 },
  ]},
  { id: 4, name: '服饰鞋包', parentId: null, children: [] },
])

const dialogVisible = ref(false)
const dialogTitle = ref('添加分类')
const formData = ref({
  id: 0,
  name: '',
  parentId: null as number | null,
})

function handleAdd(parentId: number | null = null) {
  dialogTitle.value = parentId ? '添加子分类' : '添加分类'
  formData.value = { id: 0, name: '', parentId }
  dialogVisible.value = true
}

function handleEdit(category: Category, parentId: number | null = null) {
  dialogTitle.value = '编辑分类'
  formData.value = { id: category.id, name: category.name, parentId }
  dialogVisible.value = true
}

function handleDelete(category: Category) {
  ElMessageBox.confirm(
    `确定要删除分类"${category.name}"吗？`,
    '提示',
    { type: 'warning' }
  ).then(() => {
    ElMessage.success('删除成功')
  }).catch(() => {})
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
      <el-button type="primary" @click="handleAdd()">
        <el-icon><Plus /></el-icon>
        添加分类
      </el-button>
    </div>

    <!-- Category List -->
    <div class="card">
      <el-table :data="categories" v-loading="loading" row-key="id" default-expand-all>
        <el-table-column prop="name" label="分类名称" min-width="200" />
        <el-table-column label="类型" width="120">
          <template #default="{ row }">
            <el-tag :type="row.parentId ? 'info' : 'primary'" size="small">
              {{ row.parentId ? '子分类' : '一级分类' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="子分类数量" width="120">
          <template #default="{ row }">
            {{ row.children?.length || 0 }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="!row.parentId"
              type="primary"
              text
              size="small"
              @click="handleAdd(row.id)"
            >
              <el-icon><Plus /></el-icon>添加子分类
            </el-button>
            <el-button type="primary" text size="small" @click="handleEdit(row, row.parentId)">
              <el-icon><Edit /></el-icon>编辑
            </el-button>
            <el-button type="danger" text size="small" @click="handleDelete(row)">
              <el-icon><Delete /></el-icon>删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- Dialog -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="400px">
      <el-form :model="formData" label-width="80px">
        <el-form-item label="分类名称" required>
          <el-input v-model="formData.name" placeholder="请输入分类名称" />
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
@import '@/assets/styles/variables';

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
</style>