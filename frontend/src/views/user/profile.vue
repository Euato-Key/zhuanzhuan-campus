<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '@/components/layout/AppLayout.vue'
import AvatarUpload from '@/components/AvatarUpload.vue'
import { useUserStore } from '@/stores/user'
import { useAuthDialog } from '@/composables/useAuthDialog'
import { sendCode } from '@/api/auth'
import { getOssUrl } from '@/utils/oss'
import { ElMessage, ElMessageBox } from 'element-plus'
import { User, Lock, Message, School, Location, Phone, EditPen, Check, Calendar, Star } from '@element-plus/icons-vue'
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

// ─── Edit mode ───
const editingProfile = ref(false)
const editingPassword = ref(false)
const editingEmail = ref(false)
const editingAvatar = ref(false)

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
    initProfileForm()
  }
})

watch(() => userStore.user, () => {
  if (userStore.user) {
    initProfileForm()
  }
}, { deep: true })

function initProfileForm() {
  const user = userStore.user
  if (!user) return
  profileForm.username = user.username || ''
  // These fields need to be fetched from profile API
  profileForm.school = ''
  profileForm.campus = ''
  profileForm.phone = ''
  profileForm.bio = ''
}

// Start editing profile
function startEditProfile() {
  initProfileForm()
  editingProfile.value = true
}

function cancelEditProfile() {
  editingProfile.value = false
}

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
    editingAvatar.value = false
    ElMessage.success('头像已保存')
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '保存头像失败')
  } finally {
    avatarSaving.value = false
  }
}

function cancelEditAvatar() {
  avatarTempPath.value = null
  editingAvatar.value = false
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
    editingProfile.value = false
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

function startEditPassword() {
  passwordForm.oldPassword = ''
  passwordForm.newPassword = ''
  passwordForm.confirmPassword = ''
  editingPassword.value = true
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

function startEditEmail() {
  emailForm.newEmail = ''
  emailForm.code = ''
  editingEmail.value = true
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

// ─── Format date ───
function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}
</script>

<template>
  <AppLayout>
    <div class="profile-page">
      <!-- Profile Card -->
      <div class="profile-card">
        <!-- Avatar section -->
        <div class="avatar-section">
          <div v-if="!editingAvatar" class="avatar-wrap" @click="editingAvatar = true">
            <img
              :src="getOssUrl(userStore.user?.avatar)"
              class="avatar-img"
              alt="用户头像"
            />
            <div class="avatar-edit-btn">
              <el-icon><EditPen /></el-icon>
            </div>
          </div>
          <template v-else>
            <AvatarUpload
              :model-value="avatarTempPath || userStore.user?.avatar"
              @success="handleAvatarSuccess"
            />
            <div v-if="avatarTempPath" class="save-avatar">
              <el-button type="primary" size="small" :loading="avatarSaving" @click="saveAvatar">
                保存
              </el-button>
              <el-button size="small" @click="cancelEditAvatar">取消</el-button>
            </div>
            <div v-else class="save-avatar">
              <el-button size="small" @click="cancelEditAvatar">取消</el-button>
            </div>
          </template>
        </div>

        <!-- User info -->
        <div class="user-info">
          <h1 class="user-name">{{ userStore.user?.username }}</h1>
          <p class="user-email">{{ userStore.user?.email }}</p>

          <div class="user-stats">
            <div class="stat-item">
              <span class="stat-value">{{ userStore.user?.creditScore || 100 }}</span>
              <span class="stat-label">信用分</span>
            </div>
            <div class="stat-divider"></div>
            <div class="stat-item">
              <span class="stat-value">{{ formatDate(userStore.user?.createdAt) }}</span>
              <span class="stat-label">加入时间</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Settings sections -->
      <div class="settings-sections">
        <!-- Basic info section -->
        <section class="settings-section">
          <div class="section-header">
            <h2>
              <el-icon><User /></el-icon>
              基本信息
            </h2>
            <el-button
              v-if="!editingProfile"
              type="primary"
              text
              @click="startEditProfile"
            >
              <el-icon><EditPen /></el-icon>
              编辑
            </el-button>
          </div>

          <!-- View mode -->
          <div v-if="!editingProfile" class="info-grid">
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
            ref="profileFormRef"
            :model="profileForm"
            :rules="profileRules"
            label-position="top"
          >
            <div class="form-grid">
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

              <el-form-item label="个人简介" class="full-width">
                <el-input
                  v-model="profileForm.bio"
                  type="textarea"
                  :rows="4"
                  placeholder="介绍一下自己吧..."
                  maxlength="500"
                  show-word-limit
                />
              </el-form-item>
            </div>

            <div class="form-actions">
              <el-button @click="cancelEditProfile">取消</el-button>
              <el-button type="primary" :loading="profileLoading" @click="handleSaveProfile">
                <el-icon><Check /></el-icon>
                保存
              </el-button>
            </div>
          </el-form>
        </section>

        <!-- Password section -->
        <section class="settings-section">
          <div class="section-header">
            <h2>
              <el-icon><Lock /></el-icon>
              账户安全
            </h2>
            <el-button
              v-if="!editingPassword && !editingEmail"
              type="primary"
              text
              @click="startEditPassword"
            >
              <el-icon><EditPen /></el-icon>
              修改密码
            </el-button>
          </div>

          <!-- View mode -->
          <div v-if="!editingPassword" class="security-info">
            <div class="security-item">
              <span class="security-label">登录密码</span>
              <span class="security-value">已设置</span>
            </div>
          </div>

          <!-- Edit mode -->
          <el-form
            v-else
            ref="passwordFormRef"
            :model="passwordForm"
            :rules="passwordRules"
            label-position="top"
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

            <div class="form-actions">
              <el-button @click="editingPassword = false">取消</el-button>
              <el-button type="primary" :loading="passwordLoading" @click="handleChangePassword">
                确认修改
              </el-button>
            </div>
          </el-form>
        </section>

        <!-- Email section -->
        <section class="settings-section">
          <div class="section-header">
            <h2>
              <el-icon><Message /></el-icon>
              邮箱设置
            </h2>
            <el-button
              v-if="!editingEmail && !editingPassword"
              type="primary"
              text
              @click="startEditEmail"
            >
              <el-icon><EditPen /></el-icon>
              修改邮箱
            </el-button>
          </div>

          <!-- View mode -->
          <div v-if="!editingEmail" class="security-info">
            <div class="security-item">
              <span class="security-label">绑定邮箱</span>
              <span class="security-value">{{ userStore.user?.email }}</span>
            </div>
          </div>

          <!-- Edit mode -->
          <el-form
            v-else
            ref="emailFormRef"
            :model="emailForm"
            :rules="emailRules"
            label-position="top"
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

            <div class="form-actions">
              <el-button @click="editingEmail = false">取消</el-button>
              <el-button type="primary" :loading="emailLoading" @click="handleChangeEmail">
                确认修改
              </el-button>
            </div>
          </el-form>
        </section>
      </div>
    </div>
  </AppLayout>
</template>

<style scoped lang="scss">
@import '@/assets/styles/variables';

.profile-page {
  max-width: 800px;
  margin: 0 auto;
}

// ─── Profile Card ───
.profile-card {
  background: #fff;
  border-radius: $radius-lg;
  padding: 32px;
  box-shadow: $shadow-sm;
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  gap: 32px;
}

.avatar-section {
  flex-shrink: 0;
}

.avatar-wrap {
  position: relative;
  width: 120px;
  height: 120px;
}

.avatar-img {
  width: 100%;
  height: 100%;
  border-radius: $radius-full;
  object-fit: cover;
  background: $color-bg-page;
}

.avatar-edit-btn {
  position: absolute;
  bottom: 4px;
  right: 4px;
  width: 32px;
  height: 32px;
  background: $color-primary;
  color: #fff;
  border-radius: $radius-full;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: opacity $transition-fast;

  .avatar-wrap:hover & {
    opacity: 1;
  }
}

.save-avatar {
  margin-top: 12px;
  display: flex;
  gap: 8px;
  justify-content: center;
}

.user-info {
  flex: 1;
}

.user-name {
  font-size: 28px;
  font-weight: $font-weight-bold;
  color: $color-text-primary;
  margin-bottom: 4px;
}

.user-email {
  font-size: 14px;
  color: $color-text-secondary;
  margin-bottom: 20px;
}

.user-stats {
  display: flex;
  align-items: center;
  gap: 24px;
}

.stat-item {
  text-align: center;

  .stat-value {
    display: block;
    font-size: 18px;
    font-weight: $font-weight-semibold;
    color: $color-text-primary;
  }

  .stat-label {
    font-size: 12px;
    color: $color-text-placeholder;
  }
}

.stat-divider {
  width: 1px;
  height: 32px;
  background: $color-border;
}

// ─── Settings Sections ───
.settings-sections {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

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

    .el-icon {
      color: $color-primary;
    }
  }
}

// ─── Info Grid ───
.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px 32px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;

  &.full-width {
    grid-column: 1 / -1;
  }
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

// ─── Security Info ───
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

// ─── Form ───
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0 24px;

  .full-width {
    grid-column: 1 / -1;
  }
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid $color-border;
}

// ─── Code Row ───
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
  .profile-card {
    flex-direction: column;
    text-align: center;
  }

  .user-stats {
    justify-content: center;
  }

  .info-grid,
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
