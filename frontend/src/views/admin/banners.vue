<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import { Plus, Edit, Delete, Picture } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import {
  getBannerList,
  createBanner,
  updateBanner,
  deleteBanner,
  toggleBannerStatus,
  BANNER_STATUS_LABELS,
  BANNER_STATUS_TAG_TYPE,
  type BannerItem,
  type BannerStatus,
} from '@/api/modules/banner'
import { uploadImage } from '@/api/modules/upload'
import { getOssUrl } from '@/utils/oss'

const loading = ref(false)
const banners = ref<BannerItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)

const dialogVisible = ref(false)
const dialogTitle = ref('添加Banner')
const submitLoading = ref(false)
const formRef = ref<FormInstance>()
const uploadLoading = ref(false)

const formData = ref({
  id: 0,
  title: '',
  imageUrl: '',
  linkUrl: '',
  sort: 1,
  status: 'active' as BannerStatus,
  startTime: '',
  endTime: '',
})

const rules: FormRules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  imageUrl: [{ required: true, message: '请上传图片', trigger: 'change' }],
  sort: [{ required: true, message: '请输入排序', trigger: 'blur' }],
}

async function fetchList() {
  loading.value = true
  try {
    const res = await getBannerList({ page: page.value, pageSize: pageSize.value })
    if (res.data.code === 200) {
      banners.value = res.data.data.list
      total.value = res.data.data.total
    }
  } catch {
    ElMessage.error('获取列表失败')
  } finally {
    loading.value = false
  }
}

function handlePageChange(val: number) {
  page.value = val
  fetchList()
}

function handleAdd() {
  dialogTitle.value = '添加Banner'
  formData.value = { id: 0, title: '', imageUrl: '', linkUrl: '', sort: 1, status: 'active', startTime: '', endTime: '' }
  dialogVisible.value = true
}

function handleEdit(banner: BannerItem) {
  dialogTitle.value = '编辑Banner'
  formData.value = {
    id: banner.id,
    title: banner.title,
    imageUrl: banner.imageUrl,
    linkUrl: banner.linkUrl || '',
    sort: banner.sort,
    status: banner.status,
    startTime: banner.startTime ? banner.startTime.slice(0, 10) : '',
    endTime: banner.endTime ? banner.endTime.slice(0, 10) : '',
  }
  dialogVisible.value = true
}

async function handleDelete(banner: BannerItem) {
  try {
    await ElMessageBox.confirm(`确定要删除"${banner.title}"吗？`, '提示', { type: 'warning' })
    const res = await deleteBanner(banner.id)
    if (res.data.code === 200) {
      ElMessage.success('删除成功')
      fetchList()
    }
  } catch { /* cancelled */ }
}

async function handleToggleStatus(banner: BannerItem) {
  const action = banner.status === 'active' ? '禁用' : '启用'
  try {
    const res = await toggleBannerStatus(banner.id)
    if (res.data.code === 200) {
      ElMessage.success(`已${action}`)
      fetchList()
    }
  } catch {
    ElMessage.error('操作失败')
  }
}

async function handleUpload(options: any) {
  uploadLoading.value = true
  try {
    const res = await uploadImage(options.file, 'banner')
    if (res.data.code === 200) {
      formData.value.imageUrl = res.data.data.ossPath
      ElMessage.success('上传成功')
    }
  } catch {
    ElMessage.error('上传失败')
  } finally {
    uploadLoading.value = false
  }
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  submitLoading.value = true
  try {
    const data: any = {
      title: formData.value.title,
      imageUrl: formData.value.imageUrl,
      linkUrl: formData.value.linkUrl || undefined,
      sort: formData.value.sort,
      status: formData.value.status,
      startTime: formData.value.startTime || undefined,
      endTime: formData.value.endTime || undefined,
    }

    const res = formData.value.id
      ? await updateBanner(formData.value.id, data)
      : await createBanner(data)

    if (res.data.code === 200 || res.data.code === 201) {
      ElMessage.success('保存成功')
      dialogVisible.value = false
      fetchList()
    }
  } catch {
    ElMessage.error('保存失败')
  } finally {
    submitLoading.value = false
  }
}

function getStatusTagType(status: string) {
  return BANNER_STATUS_TAG_TYPE[status as BannerStatus]
}

function getStatusLabel(status: string) {
  return BANNER_STATUS_LABELS[status as BannerStatus]
}

onMounted(fetchList)
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
        <el-table-column prop="sort" label="排序" width="80" />
        <el-table-column prop="title" label="标题" min-width="150" />
        <el-table-column prop="imageUrl" label="图片" width="120">
          <template #default="{ row }">
            <el-image
              v-if="row.imageUrl"
              :src="getOssUrl(row.imageUrl)"
              :preview-src-list="[getOssUrl(row.imageUrl)]"
              fit="cover"
              class="banner-thumb"
            />
            <div v-else class="image-placeholder">
              <el-icon><Picture /></el-icon>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="linkUrl" label="跳转链接" min-width="150" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)" size="small">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="有效期" width="200">
          <template #default="{ row }">
            <template v-if="row.startTime || row.endTime">
              {{ row.startTime ? row.startTime.slice(0, 10) : '不限' }} ~ {{ row.endTime ? row.endTime.slice(0, 10) : '不限' }}
            </template>
            <span v-else class="text-muted">永久有效</span>
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

      <div v-if="total > pageSize" class="pagination-wrap">
        <el-pagination
          background
          layout="prev, pager, next"
          :total="total"
          :page-size="pageSize"
          :current-page="page"
          @current-change="handlePageChange"
        />
      </div>
    </div>

    <!-- Dialog -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="520px">
      <el-form ref="formRef" :model="formData" :rules="rules" label-width="80px">
        <el-form-item label="标题" prop="title">
          <el-input v-model="formData.title" placeholder="请输入Banner标题" />
        </el-form-item>
        <el-form-item label="图片" prop="imageUrl">
          <div class="upload-area">
            <el-image
              v-if="formData.imageUrl"
              :src="getOssUrl(formData.imageUrl)"
              fit="cover"
              class="upload-preview"
            />
            <el-upload
              :show-file-list="false"
              :before-upload="() => true"
              :http-request="handleUpload"
              accept="image/*"
            >
              <el-button :loading="uploadLoading" type="primary" plain size="small">
                {{ formData.imageUrl ? '更换图片' : '上传图片' }}
              </el-button>
            </el-upload>
          </div>
        </el-form-item>
        <el-form-item label="跳转链接">
          <el-input v-model="formData.linkUrl" placeholder="点击跳转的链接（可选）" />
        </el-form-item>
        <el-form-item label="排序" prop="sort">
          <el-input-number v-model="formData.sort" :min="1" :max="99" />
        </el-form-item>
        <el-form-item label="有效期">
          <el-date-picker
            v-model="formData.startTime"
            type="date"
            placeholder="开始日期"
            style="width: 45%"
            value-format="YYYY-MM-DD"
          />
          <span style="margin: 0 8px">~</span>
          <el-date-picker
            v-model="formData.endTime"
            type="date"
            placeholder="结束日期"
            style="width: 45%"
            value-format="YYYY-MM-DD"
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
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">确定</el-button>
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

.banner-thumb {
  width: 80px;
  height: 45px;
  border-radius: $radius-sm;
}

.image-placeholder {
  width: 80px;
  height: 45px;
  background: $color-bg-page;
  border-radius: $radius-sm;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: $color-text-placeholder;
}

.text-muted {
  color: $color-text-placeholder;
  font-size: 13px;
}

.pagination-wrap {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.upload-area {
  display: flex;
  align-items: center;
  gap: 12px;
}

.upload-preview {
  width: 120px;
  height: 68px;
  border-radius: $radius-sm;
  border: 1px solid $color-border;
}
</style>