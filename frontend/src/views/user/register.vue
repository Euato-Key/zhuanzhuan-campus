<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
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
const sendingCode = ref(false)

async function sendCode() {
  if (!form.value.email) {
    ElMessage.warning('请输入邮箱')
    return
  }
  sendingCode.value = true
  // 模拟发送验证码
  setTimeout(() => {
    sendingCode.value = false
    ElMessage.success('验证码已发送')
  }, 1000)
}

async function handleRegister() {
  if (!form.value.email || !form.value.code || !form.value.username || !form.value.password) {
    ElMessage.warning('请填写完整信息')
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
  <div class="register-page">
    <div class="register-card">
      <h2>注册</h2>
      <el-form :model="form" @submit.prevent="handleRegister">
        <el-form-item>
          <el-input v-model="form.email" placeholder="邮箱">
            <template #append>
              <el-button @click="sendCode" :loading="sendingCode">获取验证码</el-button>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item>
          <el-input v-model="form.code" placeholder="验证码" />
        </el-form-item>
        <el-form-item>
          <el-input v-model="form.username" placeholder="用户名" />
        </el-form-item>
        <el-form-item>
          <el-input v-model="form.password" type="password" placeholder="密码" />
        </el-form-item>
        <el-form-item>
          <el-input v-model="form.confirmPassword" type="password" placeholder="确认密码" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" native-type="submit" style="width: 100%">
            注册
          </el-button>
        </el-form-item>
      </el-form>
      <div class="links">
        <RouterLink to="/login">已有账号？立即登录</RouterLink>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.register-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.register-card {
  background: #fff;
  padding: 40px;
  border-radius: 12px;
  width: 400px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);

  h2 {
    text-align: center;
    margin-bottom: 30px;
  }
}

.links {
  text-align: center;
  margin-top: 15px;

  a {
    color: #409eff;
  }
}
</style>