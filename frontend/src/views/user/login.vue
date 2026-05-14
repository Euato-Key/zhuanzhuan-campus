<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { ElMessage } from 'element-plus'

const router = useRouter()
const userStore = useUserStore()

const form = ref({
  username: '',
  password: ''
})
const loading = ref(false)

async function handleLogin() {
  if (!form.value.username || !form.value.password) {
    ElMessage.warning('请输入用户名和密码')
    return
  }
  loading.value = true
  try {
    await userStore.login(form.value.username, form.value.password)
    ElMessage.success('登录成功')
    router.push('/')
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '登录失败')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-header">
        <h2>欢迎回来</h2>
        <p>登录转转校园，发现校园好物</p>
      </div>
      <el-form :model="form" @submit.prevent="handleLogin" label-position="top">
        <el-form-item label="用户名 / 箱">
          <el-input v-model="form.username" placeholder="请输入用户名或邮箱" size="large" prefix-icon="User" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="form.password" type="password" placeholder="请输入密码" size="large" prefix-icon="Lock" show-password />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" native-type="submit" size="large" class="auth-btn">
            登录
          </el-button>
        </el-form-item>
      </el-form>
      <div class="auth-links">
        <RouterLink to="/forgot-password">忘记密码？</RouterLink>
        <RouterLink to="/register">还没有账号？立即注册</RouterLink>
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