<script setup lang="ts">
import { ref, reactive, computed, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useAuthDialog } from '@/composables/useAuthDialog'
import { sendCode } from '@/api/auth'
import { ElMessage } from 'element-plus'
import { Message, EditPen } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'

const router = useRouter()
const userStore = useUserStore()
const authDialog = useAuthDialog()

const editing = ref(false)
const formRef = ref<FormInstance>()
const loading = ref(false)
const codeSending = ref(false)
const countdown = ref(0)

const form = reactive({
  newEmail: '',
  code: '',
})

let countdownTimer: ReturnType<typeof setInterval> | null = null

const rules: FormRules = {
  newEmail: [
    { required: true, message: '请输入新邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  code: [
    { required: true, message: '请输入验证码', trigger: 'blur' },
    { len: 6, message: '验证码为6位数字', trigger: 'blur' }
  ],
}

const codeBtnText = computed(() =>
  countdown.value > 0 ? `${countdown.value}s` : '获取验证码'
)

function startCountdown() {
  countdown.value = 60
  if (countdownTimer) clearInterval(countdownTimer)
  countdownTimer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0 && countdownTimer) {
      clearInterval(countdownTimer)
      countdownTimer = null
    }
  }, 1000)
}

function startEdit() {
  form.newEmail = ''
  form.code = ''
  editing.value = true
}

async function handleSendCode() {
  if (!form.newEmail) {
    ElMessage.warning('请先输入新邮箱')
    return
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(form.newEmail)) {
    ElMessage.warning('请输入正确的邮箱格式')
    return
  }

  codeSending.value = true
  try {
    await sendCode(form.newEmail, 'change_email')
    ElMessage.success('验证码已发送至新邮箱')
    startCountdown()
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '发送失败')
  } finally {
    codeSending.value = false
  }
}

async function handleSave() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    await userStore.changeEmail(form.newEmail, form.code)
    ElMessage.success('邮箱已修改，请重新登录')
    authDialog.open('login')
    router.push('/')
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '修改失败')
  } finally {
    loading.value = false
  }
}

onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer)
})
</script>

<template>
  <section class="settings-section">
    <div class="section-header">
      <h2>
        <el-icon><Message /></el-icon>
        邮箱设置
      </h2>
      <el-button v-if="!editing" type="primary" text @click="startEdit">
        <el-icon><EditPen /></el-icon>
        修改邮箱
      </el-button>
    </div>

    <!-- View mode -->
    <div v-if="!editing" class="security-info">
      <div class="security-item">
        <span class="security-label">绑定邮箱</span>
        <span class="security-value">{{ userStore.user?.email }}</span>
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
      <el-form-item label="新邮箱" prop="newEmail">
        <el-input v-model="form.newEmail" placeholder="请输入新邮箱地址" :prefix-icon="Message" clearable />
      </el-form-item>

      <el-form-item label="验证码" prop="code">
        <div class="code-row">
          <el-input v-model="form.code" placeholder="6位验证码" maxlength="6" clearable />
          <el-button :loading="codeSending" :disabled="countdown > 0" @click="handleSendCode">
            {{ codeBtnText }}
          </el-button>
        </div>
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
@import '@/assets/styles/variables';

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

.code-row {
  display: flex;
  gap: 10px;
  width: 100%;

  .el-input { flex: 1; }
  .el-button { white-space: nowrap; min-width: 100px; }
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