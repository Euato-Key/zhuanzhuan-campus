<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import { Plus, Edit, Delete } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getCategoryTree,
  createCategory,
  updateCategory,
  deleteCategory,
  type Category,
} from '@/api/category'

const loading = ref(false)
const categories = ref<Category[]>([])

const dialogVisible = ref(false)
const dialogTitle = ref('添加分类')
const formLoading = ref(false)
const formData = ref({
  id: 0,
  name: '',
  parentId: null as number | null,
  icon: '',
  sort: 0,
})

async function fetchCategories() {
  loading.value = true
  try {
    const res = await getCategoryTree()
    if (res.data.code === 200) {
      categories.value = res.data.data
    }
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || '获取分类列表失败')
  } finally {
    loading.value = false
  }
}

function handleAdd(parentId: number | null = null) {
  dialogTitle.value = parentId ? '添加子分类' : '添加分类'
  formData.value = { id: 0, name: '', parentId, icon: '', sort: 0 }
  dialogVisible.value = true
}

function handleEdit(category: Category, parentId: number | null = null) {
  dialogTitle.value = '编辑分类'
  formData.value = {
    id: category.id,
    name: category.name,
    parentId,
    icon: category.icon || '',
    sort: category.sort,
  }
  dialogVisible.value = true
}

async function handleDelete(category: Category) {
  try {
    await ElMessageBox.confirm(
      `确定要删除分类"${category.name}"吗？`,
      '提示',
      { type: 'warning' }
    )
    const res = await deleteCategory(category.id)
    if (res.data.code === 200) {
      ElMessage.success('删除成功')
      fetchCategories()
    }
  } catch (err: any) {
    if (err !== 'cancel') {
      ElMessage.error(err.response?.data?.message || '删除失败')
    }
  }
}

async function handleSubmit() {
  if (!formData.value.name.trim()) {
    ElMessage.warning('请输入分类名称')
    return
  }
  formLoading.value = true
  try {
    if (formData.value.id) {
      const res = await updateCategory(formData.value.id, {
        name: formData.value.name.trim(),
        icon: formData.value.icon || undefined,
        sort: formData.value.sort || undefined,
      })
      if (res.data.code === 200) {
        ElMessage.success('更新成功')
        dialogVisible.value = false
        fetchCategories()
      }
    } else {
      const res = await createCategory({
        name: formData.value.name.trim(),
        parentId: formData.value.parentId,
        icon: formData.value.icon || undefined,
        sort: formData.value.sort || undefined,
      })
      if (res.data.code === 201 || res.data.code === 200) {
        ElMessage.success('创建成功')
        dialogVisible.value = false
        fetchCategories()
      }
    }
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || '操作失败')
  } finally {
    formLoading.value = false
  }
}

onMounted(() => {
  fetchCategories()
})
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
      <el-table :data="categories" v-loading="loading" row-key="id" default-expand-all table-layout="auto">
        <el-table-column prop="name" label="分类名称" />
        <el-table-column label="类型" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.parentId ? 'info' : 'primary'" size="small">
              {{ row.parentId ? '子分类' : '一级' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="子分类" width="70" align="center">
          <template #default="{ row }">
            {{ row.children?.length || 0 }}
          </template>
        </el-table-column>
        <el-table-column prop="sort" label="排序" width="70" align="center" />
        <el-table-column label="操作" width="220">
          <template #default="{ row }">
            <el-button
              v-if="!row.parentId"
              type="primary"
              link
              size="small"
              @click="handleAdd(row.id)"
            >
              <el-icon><Plus /></el-icon>添加子分类
            </el-button>
            <el-button type="primary" link size="small" @click="handleEdit(row, row.parentId)">
              <el-icon><Edit /></el-icon>编辑
            </el-button>
            <el-button type="danger" link size="small" @click="handleDelete(row)">
              <el-icon><Delete /></el-icon>删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="!loading && categories.length === 0" description="暂无分类数据" />
    </div>

    <!-- Dialog -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="450px">
      <el-form :model="formData" label-width="80px">
        <el-form-item label="分类名称" required>
          <el-input v-model="formData.name" placeholder="请输入分类名称" maxlength="50" show-word-limit />
        </el-form-item>
        <el-form-item label="图标">
          <el-input v-model="formData.icon" placeholder="图标URL（可选）" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="formData.sort" :min="0" :max="9999" />
          <span class="sort-tip">值越大越靠前</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="formLoading" @click="handleSubmit">确定</el-button>
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
  overflow-x: auto;
}

.sort-tip {
  margin-left: 12px;
  font-size: 13px;
  color: $color-text-secondary;
}
</style>