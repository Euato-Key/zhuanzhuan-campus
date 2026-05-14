<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { sendCode } from '@/api/auth'
import { ElMessage } from 'element-plus'

const router = useRouter()
const userStore = useUserStore()

const form = ref({
  email: '',
  code: '',
  username: '',
  password: '',
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
    await sendCode(form.value.email, 'register')
    ElMessage.success('验证码已发送')
    countdown.value = 60
    countdownTimer = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0 && countdownTimer) {
        clearInterval(countdownTimer)
        countdownTimer = null
      }
    }, 1000)
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '发送失败')
  } finally {
    codeSending.value = false
  }
}

async function handleRegister() {
  if (!form.value.email || !form.value.code || !form.value.username || !form.value.password) {
    ElMessage.warning('请填写完整信息')
    return
  }
  if (form.value.password.length < 6) {
    ElMessage.warning('密码长度不能少于6位')
    return
  }
  if (form.value.password !== form.value.confirmPassword) {
    ElMessage.warning('两次密码输入不一致')
    return
  }
  loading.value = true
  try {
    await userStore.register({
      email: form.value.email,
      code: form.value.code,
      username: form.value.username,
      password: form.value.password
    })
    ElMessage.success('注册成功，请登录')
    router.push('/login')
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '注册失败')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-header">
        <h2>注册账号</h2>
        <p>加入转转校园，开启校园交易之旅</p>
      </div>
      <el-form :model="form" @submit.prevent="handleRegister" label-position="top">
        <el-form-item label="邮箱">
          <el-input v-model="form.email" placeholder="请输入邮箱" size="large" prefix-icon="Message" />
        </el-form-item>
        <el-form-item label="验证码">
          <div class="code-row">
            <el-input v-model="form.code" placeholder="6位验证码" size="large" maxlength="6" />
            <el-button :loading="codeSending" :disabled="countdown > 0" @click="handleSendCode" size="large">
              {{ codeBtnText }}
            </el-button>
          </div>
        </el-form-item>
        <el-form-item label="用户名">
          <el-input v-model="form.username" placeholder="2-50个字符" size="large" prefix-icon="User" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="form.password" type="password" placeholder="至少6位" size="large" prefix-icon="Lock" show-password />
        </el-form-item>
        <el-form-item label="确认密码">
          <el-input v-model="form.confirmPassword" type="password" placeholder="再次输入密码" size="large" prefix-icon="Lock" show-password />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" native-type="submit" size="large" class="auth-btn">
            注册
          </el-button>
        </el-form-item>
      </el-form>
      <div class="auth-links">
        <span></span>
        <RouterLink to="/login">已有账号？立即登录</RouterLink>
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
  margin-bottom: 32px;

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