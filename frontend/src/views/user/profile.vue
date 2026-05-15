<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '@/components/layout/AppLayout.vue'
import AvatarUpload from '@/components/AvatarUpload.vue'
import { useUserStore } from '@/stores/user'
import { useAuthDialog } from '@/composables/useAuthDialog'
import { sendCode } from '@/api/auth'
import { ElMessage, ElMessageBox } from 'element-plus'
import { User, Lock, Message, School, Location, Phone, EditPen, Check } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'

const router = useRouter()
const userStore = useUserStore()
const authDialog = useAuthDialog()

// ─── Auth check ───
onMounted(() => {
  if (!userStore.isLoggedIn) {
    authDialog.open('login')
    router.push('/')
  }
})

// ─── Tabs ───
const activeTab = ref('profile')
const tabs = [
  { key: 'profile', label: '个人资料', icon: User },
  { key: 'password', label: '修改密码', icon: Lock },
  { key: 'email', label: '修改邮箱', icon: Message },
]

// ─── Profile form ───
const profileFormRef = ref<FormInstance>()
const profileLoading = ref(false)
const profileForm = reactive({
  username: '',
  school: '',
  campus: '',
  phone: '',
  bio: '',
})

const profileRules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 2, max: 50, message: '用户名长度为2-50个字符', trigger: 'blur' }
  ],
  phone: [
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号格式', trigger: 'blur' }
  ],
}

// Initialize form with user data
onMounted(() => {
  if (userStore.user) {
    profileForm.username = userStore.user.username || ''
    // Fetch full profile to get school, campus, phone, bio
    userStore.fetchUser().then(() => {
      // These fields might not be in the basic user object, need to fetch from profile API
    })
  }
})

// ─── Avatar upload ───
const avatarTempPath = ref<string | null>(null)
const avatarSaving = ref(false)

async function handleAvatarSuccess(tempPath: string) {
  avatarTempPath.value = tempPath
}

async function saveAvatar() {
  if (!avatarTempPath.value) return

  avatarSaving.value = true
  try {
    await userStore.updateAvatar(avatarTempPath.value)
    avatarTempPath.value = null
    ElMessage.success('头像已保存')
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '保存头像失败')
  } finally {
    avatarSaving.value = false
  }
}

// ─── Profile save ───
async function handleSaveProfile() {
  const valid = await profileFormRef.value?.validate().catch(() => false)
  if (!valid) return

  profileLoading.value = true
  try {
    await userStore.updateProfile({
      username: profileForm.username,
      school: profileForm.school || undefined,
      campus: profileForm.campus || undefined,
      phone: profileForm.phone || undefined,
      bio: profileForm.bio || undefined,
    })
    ElMessage.success('资料已更新')
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '更新失败')
  } finally {
    profileLoading.value = false
  }
}

// ─── Password form ───
const passwordFormRef = ref<FormInstance>()
const passwordLoading = ref(false)
const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const validateConfirmPassword = (_rule: unknown, value: string, callback: (error?: Error) => void) => {
  if (value !== passwordForm.newPassword) {
    callback(new Error('两次密码输入不一致'))
  } else {
    callback()
  }
}

const passwordRules: FormRules = {
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

async function handleChangePassword() {
  const valid = await passwordFormRef.value?.validate().catch(() => false)
  if (!valid) return

  passwordLoading.value = true
  try {
    await userStore.changePassword(passwordForm.oldPassword, passwordForm.newPassword)
    ElMessage.success('密码已修改，请重新登录')
    authDialog.open('login')
    router.push('/')
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '修改失败')
  } finally {
    passwordLoading.value = false
  }
}

// ─── Email form ───
const emailFormRef = ref<FormInstance>()
const emailLoading = ref(false)
const codeSending = ref(false)
const countdown = ref(0)
const emailForm = reactive({
  newEmail: '',
  code: '',
})

let countdownTimer: ReturnType<typeof setInterval> | null = null

const emailRules: FormRules = {
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

async function handleSendCode() {
  if (!emailForm.newEmail) {
    ElMessage.warning('请先输入新邮箱')
    return
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(emailForm.newEmail)) {
    ElMessage.warning('请输入正确的邮箱格式')
    return
  }

  codeSending.value = true
  try {
    await sendCode(emailForm.newEmail, 'change_email')
    ElMessage.success('验证码已发送至新邮箱')
    startCountdown()
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '发送失败')
  } finally {
    codeSending.value = false
  }
}

async function handleChangeEmail() {
  const valid = await emailFormRef.value?.validate().catch(() => false)
  if (!valid) return

  emailLoading.value = true
  try {
    await userStore.changeEmail(emailForm.newEmail, emailForm.code)
    ElMessage.success('邮箱已修改，请重新登录')
    authDialog.open('login')
    router.push('/')
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '修改失败')
  } finally {
    emailLoading.value = false
  }
}

// ─── Cleanup ───
onMounted(() => {
  // Cleanup countdown timer on unmount
})
</script>

<template>
  <AppLayout>
    <div class="profile-page">
      <!-- Sidebar -->
      <aside class="profile-sidebar">
        <div class="user-card">
          <AvatarUpload
            v-model="avatarTempPath"
            @success="handleAvatarSuccess"
          />
          <div v-if="avatarTempPath" class="save-avatar">
            <el-button type="primary" size="small" :loading="avatarSaving" @click="saveAvatar">
              保存头像
            </el-button>
          </div>
          <h3 class="user-name">{{ userStore.user?.username }}</h3>
          <p class="user-email">{{ userStore.user?.email }}</p>
          <div class="user-stats">
            <div class="stat">
              <span class="stat-value">{{ userStore.user?.creditScore || 100 }}</span>
              <span class="stat-label">信用分</span>
            </div>
          </div>
        </div>

        <nav class="sidebar-nav">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            :class="['nav-item', { active: activeTab === tab.key }]"
            @click="activeTab = tab.key"
          >
            <el-icon><component :is="tab.icon" /></el-icon>
            {{ tab.label }}
          </button>
        </nav>
      </aside>

      <!-- Content -->
      <main class="profile-content">
        <!-- Profile tab -->
        <div v-show="activeTab === 'profile'" class="content-panel">
          <div class="panel-header">
            <h3>个人资料</h3>
            <p>修改你的基本信息</p>
          </div>

          <el-form
            ref="profileFormRef"
            :model="profileForm"
            :rules="profileRules"
            label-position="top"
            size="large"
          >
            <el-form-item label="用户名" prop="username">
              <el-input v-model="profileForm.username" placeholder="请输入用户名" :prefix-icon="User" clearable />
            </el-form-item>

            <el-form-item label="学校">
              <el-input v-model="profileForm.school" placeholder="请输入学校名称" :prefix-icon="School" clearable />
            </el-form-item>

            <el-form-item label="校区">
              <el-input v-model="profileForm.campus" placeholder="请输入校区名称" :prefix-icon="Location" clearable />
            </el-form-item>

            <el-form-item label="手机号">
              <el-input v-model="profileForm.phone" placeholder="请输入手机号" :prefix-icon="Phone" clearable />
            </el-form-item>

            <el-form-item label="个人简介">
              <el-input
                v-model="profileForm.bio"
                type="textarea"
                :rows="4"
                placeholder="介绍一下自己吧..."
                maxlength="500"
                show-word-limit
              />
            </el-form-item>

            <el-form-item>
              <el-button type="primary" :loading="profileLoading" @click="handleSaveProfile">
                <el-icon><Check /></el-icon>
                保存修改
              </el-button>
            </el-form-item>
          </el-form>
        </div>

        <!-- Password tab -->
        <div v-show="activeTab === 'password'" class="content-panel">
          <div class="panel-header">
            <h3>修改密码</h3>
            <p>修改密码后需要重新登录</p>
          </div>

          <el-form
            ref="passwordFormRef"
            :model="passwordForm"
            :rules="passwordRules"
            label-position="top"
            size="large"
          >
            <el-form-item label="旧密码" prop="oldPassword">
              <el-input
                v-model="passwordForm.oldPassword"
                type="password"
                placeholder="请输入当前密码"
                :prefix-icon="Lock"
                show-password
              />
            </el-form-item>

            <el-form-item label="新密码" prop="newPassword">
              <el-input
                v-model="passwordForm.newPassword"
                type="password"
                placeholder="至少6位，建议包含字母和数字"
                :prefix-icon="Lock"
                show-password
              />
            </el-form-item>

            <el-form-item label="确认新密码" prop="confirmPassword">
              <el-input
                v-model="passwordForm.confirmPassword"
                type="password"
                placeholder="再次输入新密码"
                :prefix-icon="Lock"
                show-password
              />
            </el-form-item>

            <el-form-item>
              <el-button type="primary" :loading="passwordLoading" @click="handleChangePassword">
                <el-icon><Check /></el-icon>
                修改密码
              </el-button>
            </el-form-item>
          </el-form>
        </div>

        <!-- Email tab -->
        <div v-show="activeTab === 'email'" class="content-panel">
          <div class="panel-header">
            <h3>修改邮箱</h3>
            <p>修改邮箱后需要重新登录</p>
          </div>

          <el-form
            ref="emailFormRef"
            :model="emailForm"
            :rules="emailRules"
            label-position="top"
            size="large"
          >
            <el-form-item label="新邮箱" prop="newEmail">
              <el-input v-model="emailForm.newEmail" placeholder="请输入新邮箱地址" :prefix-icon="Message" clearable />
            </el-form-item>

            <el-form-item label="验证码" prop="code">
              <div class="code-row">
                <el-input v-model="emailForm.code" placeholder="6位验证码" maxlength="6" clearable />
                <el-button :loading="codeSending" :disabled="countdown > 0" @click="handleSendCode">
                  {{ codeBtnText }}
                </el-button>
              </div>
            </el-form-item>

            <el-form-item>
              <el-button type="primary" :loading="emailLoading" @click="handleChangeEmail">
                <el-icon><Check /></el-icon>
                修改邮箱
              </el-button>
            </el-form-item>
          </el-form>
        </div>
      </main>
    </div>
  </AppLayout>
</template>

<style scoped lang="scss">
@import '@/assets/styles/variables';

.profile-page {
  display: flex;
  gap: 24px;
  max-width: 900px;
  margin: 0 auto;
}

// ─── Sidebar ───
.profile-sidebar {
  width: 240px;
  flex-shrink: 0;
}

.user-card {
  background: #fff;
  border-radius: $radius-lg;
  padding: 24px;
  text-align: center;
  box-shadow: $shadow-sm;
  margin-bottom: 16px;

  .save-avatar {
    margin-top: 12px;
  }

  .user-name {
    font-size: 18px;
    font-weight: $font-weight-semibold;
    color: $color-text-primary;
    margin: 16px 0 4px;
  }

  .user-email {
    font-size: 14px;
    color: $color-text-secondary;
    margin-bottom: 16px;
  }

  .user-stats {
    display: flex;
    justify-content: center;
    gap: 24px;

    .stat {
      text-align: center;

      .stat-value {
        font-size: 20px;
        font-weight: $font-weight-bold;
        color: $color-primary;
      }

      .stat-label {
        font-size: 12px;
        color: $color-text-placeholder;
      }
    }
  }
}

.sidebar-nav {
  background: #fff;
  border-radius: $radius-lg;
  padding: 8px;
  box-shadow: $shadow-sm;

  .nav-item {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 12px 16px;
    border: none;
    background: transparent;
    border-radius: $radius-md;
    font-size: 14px;
    color: $color-text-secondary;
    cursor: pointer;
    transition: all $transition-fast;

    &:hover {
      color: $color-primary;
      background: $color-primary-pale;
    }

    &.active {
      color: $color-primary;
      background: $color-primary-pale;
      font-weight: $font-weight-medium;
    }
  }
}

// ─── Content ───
.profile-content {
  flex: 1;
  min-width: 0;
}

.content-panel {
  background: #fff;
  border-radius: $radius-lg;
  padding: 24px;
  box-shadow: $shadow-sm;
}

.panel-header {
  margin-bottom: 24px;

  h3 {
    font-size: 20px;
    font-weight: $font-weight-semibold;
    color: $color-text-primary;
    margin-bottom: 4px;
  }

  p {
    font-size: 14px;
    color: $color-text-secondary;
  }
}

// ─── Code row ───
.code-row {
  display: flex;
  gap: 10px;
  width: 100%;

  .el-input { flex: 1; }

  .el-button {
    white-space: nowrap;
    min-width: 100px;
  }
}

// ─── Responsive ───
@media (max-width: 768px) {
  .profile-page {
    flex-direction: column;
  }

  .profile-sidebar {
    width: 100%;
  }
}
</style>