<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { sendCode, resetPassword } from '@/api/auth'
import { ElMessage } from 'element-plus'

const router = useRouter()

const step = ref(1)
const form = ref({
  email: '',
  code: '',
  newPassword: '',
  confirmPassword: ''
})
const loading = ref(false)
const codeSending = ref(false)
const countdown = ref(0)

let countdownTimer: ReturnType<typeof setInterval> | null = null

const codeBtnText = computed(() => countdown.value > 0 ? `${countdown.value}s 后重发` : '获取验证码')

async function handleSendCode() {
  if (!form.value.email) {
    ElMessage.warning('请输入邮箱')
    return
  }
  codeSending.value = true
  try {
    await sendCode(form.value.email, 'reset_password')
    ElMessage.success('验证码已发送')
    countdown.value = 60
    countdownTimer = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0 && countdownTimer) {
        clearInterval(countdownTimer)
        countdownTimer = null
      }
    }, 1000)
    step.value = 2
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '发送失败')
  } finally {
    codeSending.value = false
  }
}

async function handleReset() {
  if (!form.value.code) {
    ElMessage.warning('请输入验证码')
    return
  }
  if (!form.value.newPassword || form.value.newPassword.length < 6) {
    ElMessage.warning('密码长度不能少于6位')
    return
  }
  if (form.value.newPassword !== form.value.confirmPassword) {
    ElMessage.warning('两次密码输入不一致')
    return
  }
  loading.value = true
  try {
    await resetPassword(form.value.email, form.value.code, form.value.newPassword)
    ElMessage.success('密码重置成功，请登录')
    router.push('/login')
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '重置失败')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-header">
        <h2>找回密码</h2>
        <p>通过邮箱验证码重置你的密码</p>
      </div>

      <div class="steps">
        <div :class="['step-item', { active: step >= 1, done: step > 1 }]">
          <span class="step-num">1</span>
          <span>验证邮箱</span>
        </div>
        <div :class="['step-item', { active: step >= 2 }]">
          <span class="step-num">2</span>
          <span>重置密码</span>
        </div>
      </div>

      <!-- Step 1: 验证邮箱 -->
      <el-form v-if="step === 1" @submit.prevent="handleSendCode" label-position="top">
        <el-form-item label="注册邮箱">
          <el-input v-model="form.email" placeholder="请输入注册时使用的邮箱" size="large" prefix-icon="Message" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="codeSending" native-type="submit" size="large" class="auth-btn">
            发送验证码
          </el-button>
        </el-form-item>
      </el-form>

      <!-- Step 2: 重置密码 -->
      <el-form v-if="step === 2" @submit.prevent="handleReset" label-position="top">
        <el-form-item label="验证码">
          <div class="code-row">
            <el-input v-model="form.code" placeholder="6位验证码" size="large" maxlength="6" />
            <el-button :disabled="countdown > 0" @click="handleSendCode" size="large">
              {{ codeBtnText }}
            </el-button>
          </div>
        </el-form-item>
        <el-form-item label="新密码">
          <el-input v-model="form.newPassword" type="password" placeholder="至少6位" size="large" prefix-icon="Lock" show-password />
        </el-form-item>
        <el-form-item label="确认新密码">
          <el-input v-model="form.confirmPassword" type="password" placeholder="再次输入新密码" size="large" prefix-icon="Lock" show-password />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" native-type="submit" size="large" class="auth-btn">
            重置密码
          </el-button>
        </el-form-item>
      </el-form>

      <div class="auth-links">
        <RouterLink to="/login">返回登录</RouterLink>
        <RouterLink to="/register">注册新账号</RouterLink>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@import '@/assets/styles/variables';

.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, $color-primary-light 0%, #E8F5E9 50%, #C8E6C9 100%);
}

.auth-card {
  background: #fff;
  padding: 40px 36px;
  border-radius: $radius-lg;
  width: 420px;
  box-shadow: $shadow-primary;
}

.auth-header {
  text-align: center;
  margin-bottom: 24px;

  h2 {
    color: $color-primary-dark;
    font-size: 24px;
    margin-bottom: 8px;
  }

  p {
    color: $color-text-secondary;
    font-size: 14px;
  }
}

.steps {
  display: flex;
  justify-content: center;
  gap: 32px;
  margin-bottom: 24px;

  .step-item {
    display: flex;
    align-items: center;
    gap: 8px;
    color: $color-text-secondary;
    font-size: 14px;

    &.active {
      color: $color-primary-dark;
    }

    &.done {
      color: $color-primary;
    }

    .step-num {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: $color-text-placeholder;
      color: #fff;
      font-size: 12px;
    }

    &.active .step-num {
      background: $color-primary;
    }

    &.done .step-num {
      background: $color-primary-dark;
    }
  }
}

.code-row {
  display: flex;
  gap: 12px;
  width: 100%;

  .el-input {
    flex: 1;
  }
}

.auth-btn {
  width: 100%;
  border-radius: $radius-md;
}

.auth-links {
  display: flex;
  justify-content: space-between;
  margin-top: 16px;

  a {
    color: $color-primary;
    font-size: 14px;
    &:hover {
      color: $color-primary-dark;
    }
  }
}
</style>