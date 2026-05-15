<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useAuthDialog } from '@/composables/useAuthDialog'
import { ElMessage } from 'element-plus'
import { Lock, EditPen } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'

const router = useRouter()
const userStore = useUserStore()
const authDialog = useAuthDialog()

const editing = ref(false)
const formRef = ref<FormInstance>()
const loading = ref(false)

const form = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const validateConfirmPassword = (_rule: unknown, value: string, callback: (error?: Error) => void) => {
  if (value !== form.newPassword) {
    callback(new Error('两次密码输入不一致'))
  } else {
    callback()
  }
}

const rules: FormRules = {
  oldPassword: [
    { required: true, message: '请输入旧密码', trigger: 'blur' }
  ],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: 'blur' }
  ],
}

function startEdit() {
  form.oldPassword = ''
  form.newPassword = ''
  form.confirmPassword = ''
  editing.value = true
}

async function handleSave() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    await userStore.changePassword(form.oldPassword, form.newPassword)
    ElMessage.success('密码已修改，请重新登录')
    authDialog.open('login')
    router.push('/')
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '修改失败')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section class="settings-section">
    <div class="section-header">
      <h2>
        <el-icon><Lock /></el-icon>
        账户安全
      </h2>
      <el-button v-if="!editing" type="primary" text @click="startEdit">
        <el-icon><EditPen /></el-icon>
        修改密码
      </el-button>
    </div>

    <!-- View mode -->
    <div v-if="!editing" class="security-info">
      <div class="security-item">
        <span class="security-label">登录密码</span>
        <span class="security-value">已设置</span>
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
      <el-form-item label="旧密码" prop="oldPassword">
        <el-input
          v-model="form.oldPassword"
          type="password"
          placeholder="请输入当前密码"
          :prefix-icon="Lock"
          show-password
        />
      </el-form-item>

      <el-form-item label="新密码" prop="newPassword">
        <el-input
          v-model="form.newPassword"
          type="password"
          placeholder="至少6位，建议包含字母和数字"
          :prefix-icon="Lock"
          show-password
        />
      </el-form-item>

      <el-form-item label="确认新密码" prop="confirmPassword">
        <el-input
          v-model="form.confirmPassword"
          type="password"
          placeholder="再次输入新密码"
          :prefix-icon="Lock"
          show-password
        />
      </el-form-item>

      <div class="form-actions">
        <el-button @click="editing = false">取消</el-button>
        <el-button type="primary" :loading="loading" @click="handleSave">
          确认修改
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

.security-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.security-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
}

.security-label {
  font-size: 14px;
  color: $color-text-secondary;
}

.security-value {
  font-size: 14px;
  color: $color-text-primary;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid $color-border;
}
</style>