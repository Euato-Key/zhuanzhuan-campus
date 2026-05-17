<script setup lang="ts">
import { ref, reactive, watch, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { ElMessage } from 'element-plus'
import { User, School, Location, Phone, EditPen, Check } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import { searchUniversities } from '@/api/modules/university'

const userStore = useUserStore()

const editing = ref(false)
const formRef = ref<FormInstance>()
const loading = ref(false)

const form = reactive({
  username: '',
  school: '',
  campus: '',
  phone: '',
  bio: '',
})

const rules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 2, max: 50, message: '用户名长度为2-50个字符', trigger: 'blur' }
  ],
  phone: [
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号格式', trigger: 'blur' }
  ],
}

function initForm() {
  const user = userStore.user
  if (!user) return
  form.username = user.username || ''
  form.school = user.school || ''
  form.campus = user.campus || ''
  form.phone = user.phone || ''
  form.bio = user.bio || ''
}

onMounted(initForm)
watch(() => userStore.user, initForm, { deep: true })

function startEdit() {
  initForm()
  editing.value = true
}

function cancelEdit() {
  editing.value = false
}

async function handleSave() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    await userStore.updateProfile({
      username: form.username,
      school: form.school || undefined,
      campus: form.campus || undefined,
      phone: form.phone || undefined,
      bio: form.bio || undefined,
    })
    ElMessage.success('资料已更新')
    editing.value = false
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '更新失败')
  } finally {
    loading.value = false
  }
}

// ─── 学校自动完成 ───
const schoolFetching = ref(false)

async function handleSchoolSearch(query: string, cb: (results: { value: string }[]) => void) {
  if (!query) {
    cb([])
    return
  }
  schoolFetching.value = true
  try {
    const res = await searchUniversities({ keyword: query, pageSize: 20 })
    cb(res.data.data.list.map((u) => ({ value: u.name })))
  } catch {
    cb([])
  } finally {
    schoolFetching.value = false
  }
}

function handleSchoolSelect(item: { value: string }) {
  form.school = item.value
}
</script>

<template>
  <section class="settings-section">
    <div class="section-header">
      <h2>
        <el-icon><User /></el-icon>
        基本信息
      </h2>
      <el-button v-if="!editing" type="primary" text @click="startEdit">
        <el-icon><EditPen /></el-icon>
        编辑
      </el-button>
    </div>

    <!-- View mode -->
    <div v-if="!editing" class="info-grid">
      <div class="info-item">
        <span class="info-label">用户名</span>
        <span class="info-value">{{ userStore.user?.username || '-' }}</span>
      </div>
      <div class="info-item">
        <span class="info-label">学校</span>
        <span class="info-value">{{ userStore.user?.school || '-' }}</span>
      </div>
      <div class="info-item">
        <span class="info-label">校区</span>
        <span class="info-value">{{ userStore.user?.campus || '-' }}</span>
      </div>
      <div class="info-item">
        <span class="info-label">手机号</span>
        <span class="info-value">{{ userStore.user?.phone || '-' }}</span>
      </div>
      <div class="info-item full-width">
        <span class="info-label">个人简介</span>
        <span class="info-value bio">{{ userStore.user?.bio || '这个人很懒，什么都没写~' }}</span>
      </div>
    </div>

    <!-- Edit mode -->
    <el-form
      v-else
      ref="formRef"
      :model="form"
      :rules="rules"
      label-position="top"
    >
      <div class="form-grid">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="请输入用户名" :prefix-icon="User" clearable />
        </el-form-item>

        <el-form-item label="学校">
          <el-autocomplete
            v-model="form.school"
            :fetch-suggestions="handleSchoolSearch"
            placeholder="搜索或输入学校名称"
            :prefix-icon="School"
            clearable
            :trigger-on-focus="false"
            @select="handleSchoolSelect"
          >
            <template #default="{ item }">
              <span>{{ item.value }}</span>
            </template>
          </el-autocomplete>
        </el-form-item>

        <el-form-item label="校区">
          <el-input v-model="form.campus" placeholder="请输入校区名称" :prefix-icon="Location" clearable />
        </el-form-item>

        <el-form-item label="手机号">
          <el-input v-model="form.phone" placeholder="请输入手机号" :prefix-icon="Phone" clearable />
        </el-form-item>

        <el-form-item label="个人简介" class="full-width">
          <el-input
            v-model="form.bio"
            type="textarea"
            :rows="4"
            placeholder="介绍一下自己吧..."
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
      </div>

      <div class="form-actions">
        <el-button @click="cancelEdit">取消</el-button>
        <el-button type="primary" :loading="loading" @click="handleSave">
          <el-icon><Check /></el-icon>
          保存
        </el-button>
      </div>
    </el-form>
  </section>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.settings-section {
  background: #fff;
  border-radius: $radius-lg;
  padding: 24px;
  box-shadow: $shadow-sm;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid $color-border;

  h2 {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 16px;
    font-weight: $font-weight-semibold;
    color: $color-text-primary;
    margin: 0;

    .el-icon { color: $color-primary; }
  }
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px 32px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;

  &.full-width { grid-column: 1 / -1; }
}

.info-label {
  font-size: 13px;
  color: $color-text-placeholder;
}

.info-value {
  font-size: 15px;
  color: $color-text-primary;

  &.bio {
    line-height: 1.6;
    white-space: pre-wrap;
  }
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0 24px;

  .full-width { grid-column: 1 / -1; }
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid $color-border;
}

@media (max-width: 768px) {
  .info-grid,
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>