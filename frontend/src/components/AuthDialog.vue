<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { useAuthDialog } from '@/composables/useAuthDialog'
import { useUserStore } from '@/stores/user'
import { useCountdown } from '@/composables/useCountdown'
import { sendCode, resetPassword } from '@/api/auth'
import { showError, showSuccess, showWarning } from '@/utils/error'
import { isValidEmail } from '@/utils/format'
import { Lock, Message, Cellphone, User, Check } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'

const { visible, mode, close, switchTo } = useAuthDialog()
const userStore = useUserStore()

// ─── Shared state ───
const loginFormRef = ref<FormInstance>()
const registerFormRef = ref<FormInstance>()
const forgotFormRef = ref<FormInstance>()

const loading = ref(false)
const codeSending = ref(false)
const { isCountingDown, buttonText: codeBtnText, start: startCountdown } = useCountdown()

// Expose countdown for debugging/testing if needed
void isCountingDown

// ─── Login form ───
const loginType = ref<'password' | 'code'>('password')
const loginForm = reactive({ email: '', password: '', code: '' })

const loginPasswordRules: FormRules = {
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6位', trigger: 'blur' }
  ]
}

const loginCodeRules: FormRules = {
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  code: [
    { required: true, message: '请输入验证码', trigger: 'blur' },
    { len: 6, message: '验证码为6位数字', trigger: 'blur' }
  ]
}

const currentLoginRules = computed(() =>
  loginType.value === 'password' ? loginPasswordRules : loginCodeRules
)

// ─── Register form ───
const registerForm = reactive({
  email: '',
  code: '',
  username: '',
  password: '',
  confirmPassword: ''
})

const validateConfirmPassword = (_rule: unknown, value: string, callback: (error?: Error) => void) => {
  if (value !== registerForm.password) {
    callback(new Error('两次密码输入不一致'))
  } else {
    callback()
  }
}

const registerRules: FormRules = {
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  code: [
    { required: true, message: '请输入验证码', trigger: 'blur' },
    { len: 6, message: '验证码为6位数字', trigger: 'blur' }
  ],
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 2, max: 50, message: '用户名长度为2-50个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: 'blur' }
  ]
}

const passwordStrength = computed(() => {
  const pwd = registerForm.password
  if (!pwd) return 0
  let score = 0
  if (pwd.length >= 6) score++
  if (pwd.length >= 10) score++
  if (/[A-Z]/.test(pwd)) score++
  if (/[0-9]/.test(pwd)) score++
  if (/[^A-Za-z0-9]/.test(pwd)) score++
  return Math.min(score, 3)
})

const strengthLabel = computed(() => ['', '弱', '中', '强'][passwordStrength.value] || '')
const strengthColor = computed(() => ['', '#F44336', '#FF9800', '#4CAF50'][passwordStrength.value] || '')

// ─── Forgot password form ───
const forgotStep = ref(1)
const forgotForm = reactive({ email: '', code: '', newPassword: '', confirmPassword: '' })

const forgotValidateConfirm = (_rule: unknown, value: string, callback: (error?: Error) => void) => {
  if (value !== forgotForm.newPassword) {
    callback(new Error('两次密码输入不一致'))
  } else {
    callback()
  }
}

const forgotStep1Rules: FormRules = {
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ]
}

const forgotStep2Rules: FormRules = {
  code: [
    { required: true, message: '请输入验证码', trigger: 'blur' },
    { len: 6, message: '验证码为6位数字', trigger: 'blur' }
  ],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    { validator: forgotValidateConfirm, trigger: 'blur' }
  ]
}

// ─── Countdown ───
const codeBtnTextComputed = computed(() =>
  isCountingDown.value ? codeBtnText.value : '获取验证码'
)

// ─── Error helper ───
function getAuthErrorMessage(error: unknown): string {
  const err = error as { response?: { status?: number; data?: { message?: string } } }
  const status = err.response?.status
  const msg = err.response?.data?.message

  switch (status) {
    case 400: return msg || '请求参数错误'
    case 401: return msg || '邮箱或密码错误'
    case 403: return msg || '账号已被封禁'
    case 404: return msg || '该邮箱未注册'
    case 409: return msg || '该邮箱已被注册'
    case 423: return msg || '密码错误次数过多，请稍后再试'
    case 429: return msg || '操作太频繁，请稍后再试'
    default: return msg || '操作失败，请稍后重试'
  }
}

// ─── Send code ───
async function handleSendCode(targetEmail: string, type: 'register' | 'login' | 'reset_password') {
  if (!targetEmail) {
    showWarning('请先输入邮箱')
    return
  }
  if (!isValidEmail(targetEmail)) {
    showWarning('请输入正确的邮箱格式')
    return
  }

  codeSending.value = true
  try {
    await sendCode(targetEmail, type)
    showSuccess('验证码已发送至您的邮箱')
    startCountdown()
  } catch (error) {
    showError(getAuthErrorMessage(error))
  } finally {
    codeSending.value = false
  }
}

// ─── Login ───
async function handleLogin() {
  const formRef = loginFormRef.value
  const valid = await formRef?.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    if (loginType.value === 'password') {
      await userStore.loginByPassword(loginForm.email, loginForm.password)
    } else {
      await userStore.loginByCode(loginForm.email, loginForm.code)
    }
    showSuccess('登录成功')
    close()
  } catch (error) {
    showError(getAuthErrorMessage(error))
  } finally {
    loading.value = false
  }
}

// ─── Register ───
async function handleRegister() {
  const valid = await registerFormRef.value?.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    await userStore.register({
      email: registerForm.email,
      code: registerForm.code,
      username: registerForm.username,
      password: registerForm.password
    })
    showSuccess('注册成功，请登录')
    // Switch to login, prefill email
    loginForm.email = registerForm.email
    switchTo('login')
  } catch (error) {
    showError(getAuthErrorMessage(error))
  } finally {
    loading.value = false
  }
}

// ─── Forgot password ───
async function handleForgotSendCode() {
  if (!forgotForm.email) {
    showWarning('请输入邮箱')
    return
  }
  if (!isValidEmail(forgotForm.email)) {
    showWarning('请输入正确的邮箱格式')
    return
  }

  codeSending.value = true
  try {
    await sendCode(forgotForm.email, 'reset_password')
    showSuccess('验证码已发送至您的邮箱')
    forgotStep.value = 2
    startCountdown()
  } catch (error) {
    showError(getAuthErrorMessage(error))
  } finally {
    codeSending.value = false
  }
}

async function handleResetPassword() {
  const valid = await forgotFormRef.value?.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    await resetPassword(forgotForm.email, forgotForm.code, forgotForm.newPassword)
    showSuccess('密码重置成功，请登录')
    loginForm.email = forgotForm.email
    switchTo('login')
    forgotStep.value = 1
  } catch (error) {
    showError(getAuthErrorMessage(error))
  } finally {
    loading.value = false
  }
}

// ─── Reset on mode change ───
watch(mode, () => {
  forgotStep.value = 1
})
</script>

<template>
  <el-dialog
    :model-value="visible"
    @update:model-value="(val: boolean) => { if (!val) close() }"
    width="440px"
    :show-close="true"
    :close-on-click-modal="false"
    class="auth-dialog"
    destroy-on-close
  >
    <!-- ═══════════ LOGIN ═══════════ -->
    <template v-if="mode === 'login'">
      <div class="dialog-header">
        <span class="dialog-logo">🎓</span>
        <h3>欢迎回来</h3>
        <p>登录转转校园，发现校园好物</p>
      </div>

      <div class="login-type-tabs">
        <button
          :class="['tab-btn', { active: loginType === 'password' }]"
          @click="loginType = 'password'"
        >
          <el-icon><Lock /></el-icon>密码登录
        </button>
        <button
          :class="['tab-btn', { active: loginType === 'code' }]"
          @click="loginType = 'code'"
        >
          <el-icon><Cellphone /></el-icon>验证码登录
        </button>
      </div>

      <el-form
        ref="loginFormRef"
        :model="loginForm"
        :rules="currentLoginRules"
        @submit.prevent="handleLogin"
        label-position="top"
        size="large"
      >
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="loginForm.email" placeholder="请输入邮箱" :prefix-icon="Message" clearable />
        </el-form-item>

        <el-form-item v-if="loginType === 'password'" label="密码" prop="password">
          <el-input v-model="loginForm.password" type="password" placeholder="请输入密码" :prefix-icon="Lock" show-password />
        </el-form-item>

        <el-form-item v-if="loginType === 'code'" label="验证码" prop="code">
          <div class="code-row">
            <el-input v-model="loginForm.code" placeholder="6位验证码" :prefix-icon="Cellphone" maxlength="6" clearable />
            <el-button :loading="codeSending" :disabled="isCountingDown" @click="handleSendCode(loginForm.email, 'login')" class="code-btn">
              {{ codeBtnTextComputed }}
            </el-button>
          </div>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :loading="loading" native-type="submit" class="auth-btn">登录</el-button>
        </el-form-item>
      </el-form>

      <div class="dialog-footer-links">
        <a class="link" @click="switchTo('forgotPassword')">忘记密码？</a>
        <a class="link" @click="switchTo('register')">还没有账号？<span class="highlight">立即注册</span></a>
      </div>
    </template>

    <!-- ═══════════ REGISTER ═══════════ -->
    <template v-if="mode === 'register'">
      <div class="dialog-header">
        <span class="dialog-logo">🎓</span>
        <h3>注册账号</h3>
        <p>加入转转校园，开启校园交易之旅</p>
      </div>

      <el-form
        ref="registerFormRef"
        :model="registerForm"
        :rules="registerRules"
        @submit.prevent="handleRegister"
        label-position="top"
        size="large"
      >
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="registerForm.email" placeholder="请输入邮箱" :prefix-icon="Message" clearable />
        </el-form-item>

        <el-form-item label="验证码" prop="code">
          <div class="code-row">
            <el-input v-model="registerForm.code" placeholder="6位验证码" :prefix-icon="Cellphone" maxlength="6" clearable />
            <el-button :loading="codeSending" :disabled="isCountingDown" @click="handleSendCode(registerForm.email, 'register')" class="code-btn">
              {{ codeBtnTextComputed }}
            </el-button>
          </div>
        </el-form-item>

        <el-form-item label="用户名" prop="username">
          <el-input v-model="registerForm.username" placeholder="2-50个字符" :prefix-icon="User" clearable />
        </el-form-item>

        <el-form-item label="密码" prop="password">
          <el-input v-model="registerForm.password" type="password" placeholder="至少6位，建议包含字母和数字" :prefix-icon="Lock" show-password />
          <div v-if="registerForm.password" class="password-strength">
            <div class="strength-bars">
              <span v-for="i in 3" :key="i" :class="['bar', { filled: i <= passwordStrength }]" :style="{ backgroundColor: i <= passwordStrength ? strengthColor : '' }" />
            </div>
            <span class="strength-text" :style="{ color: strengthColor }">密码强度：{{ strengthLabel }}</span>
          </div>
        </el-form-item>

        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input v-model="registerForm.confirmPassword" type="password" placeholder="再次输入密码" :prefix-icon="Lock" show-password />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :loading="loading" native-type="submit" class="auth-btn">注册</el-button>
        </el-form-item>
      </el-form>

      <div class="dialog-footer-links">
        <span></span>
        <a class="link" @click="switchTo('login')">已有账号？<span class="highlight">立即登录</span></a>
      </div>
    </template>

    <!-- ═══════════ FORGOT PASSWORD ═══════════ -->
    <template v-if="mode === 'forgotPassword'">
      <div class="dialog-header">
        <span class="dialog-logo">🔐</span>
        <h3>找回密码</h3>
        <p>通过邮箱验证码重置你的密码</p>
      </div>

      <div class="steps">
        <div :class="['step-item', { active: forgotStep >= 1, done: forgotStep > 1 }]">
          <span class="step-circle">
            <el-icon v-if="forgotStep > 1"><Check /></el-icon>
            <span v-else>1</span>
          </span>
          <span class="step-label">验证邮箱</span>
        </div>
        <div :class="['step-line', { active: forgotStep > 1 }]"></div>
        <div :class="['step-item', { active: forgotStep >= 2 }]">
          <span class="step-circle">2</span>
          <span class="step-label">重置密码</span>
        </div>
      </div>

      <!-- Step 1 -->
      <el-form
        v-if="forgotStep === 1"
        ref="forgotFormRef"
        :model="forgotForm"
        :rules="forgotStep1Rules"
        @submit.prevent="handleForgotSendCode"
        label-position="top"
        size="large"
      >
        <el-form-item label="注册邮箱" prop="email">
          <el-input v-model="forgotForm.email" placeholder="请输入注册时使用的邮箱" :prefix-icon="Message" clearable />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="codeSending" native-type="submit" class="auth-btn">
            {{ codeSending ? '发送中...' : '发送验证码' }}
          </el-button>
        </el-form-item>
      </el-form>

      <!-- Step 2 -->
      <el-form
        v-if="forgotStep === 2"
        ref="forgotFormRef"
        :model="forgotForm"
        :rules="forgotStep2Rules"
        @submit.prevent="handleResetPassword"
        label-position="top"
        size="large"
      >
        <el-form-item label="验证码" prop="code">
          <div class="code-row">
            <el-input v-model="forgotForm.code" placeholder="6位验证码" :prefix-icon="Cellphone" maxlength="6" clearable />
            <el-button :disabled="isCountingDown" @click="handleSendCode(forgotForm.email, 'reset_password')" class="code-btn">
              {{ codeBtnTextComputed }}
            </el-button>
          </div>
        </el-form-item>

        <el-form-item label="新密码" prop="newPassword">
          <el-input v-model="forgotForm.newPassword" type="password" placeholder="至少6位，建议包含字母和数字" :prefix-icon="Lock" show-password />
        </el-form-item>

        <el-form-item label="确认新密码" prop="confirmPassword">
          <el-input v-model="forgotForm.confirmPassword" type="password" placeholder="再次输入新密码" :prefix-icon="Lock" show-password />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :loading="loading" native-type="submit" class="auth-btn">重置密码</el-button>
        </el-form-item>
      </el-form>

      <div class="dialog-footer-links">
        <a class="link" @click="switchTo('login')">返回登录</a>
        <a class="link" @click="switchTo('register')">注册新账号</a>
      </div>
    </template>

    <div class="dialog-agreement">
      {{ mode === 'login' ? '登录' : '注册' }}即表示同意 <a href="#">用户协议</a> 和 <a href="#">隐私政策</a>
    </div>
  </el-dialog>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

// ─── Dialog header ───
.dialog-header {
  text-align: center;
  margin-bottom: 24px;

  .dialog-logo {
    font-size: 40px;
    display: inline-block;
    animation: float 3s ease-in-out infinite;
  }

  h3 {
    color: $color-primary-dark;
    font-size: $font-size-h2;
    font-weight: $font-weight-bold;
    margin: 8px 0 4px;
  }

  p {
    color: $color-text-secondary;
    font-size: $font-size-body;
  }
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

// ─── Login type tabs ───
.login-type-tabs {
  display: flex;
  background: $color-bg-page;
  border-radius: $radius-md;
  padding: 3px;
  margin-bottom: 20px;

  .tab-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    padding: 8px 0;
    border: none;
    background: transparent;
    border-radius: $radius-sm;
    font-size: 14px;
    color: $color-text-secondary;
    cursor: pointer;
    transition: all $transition-fast;
    font-family: $font-family;

    &:hover { color: $color-primary; }

    &.active {
      background: #fff;
      color: $color-primary;
      font-weight: $font-weight-medium;
      box-shadow: $shadow-sm;
    }
  }
}

// ─── Code row ───
.code-row {
  display: flex;
  gap: 10px;
  width: 100%;

  .el-input { flex: 1; }

  .code-btn {
    white-space: nowrap;
    min-width: 100px;
    border-radius: $radius-md;
    font-size: 13px;
  }
}

// ─── Password strength ───
.password-strength {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
  width: 100%;

  .strength-bars {
    display: flex;
    gap: 4px;

    .bar {
      width: 36px;
      height: 4px;
      border-radius: 2px;
      background: $color-border;
      transition: background-color $transition-fast;
    }
  }

  .strength-text {
    font-size: $font-size-small;
    white-space: nowrap;
  }
}

// ─── Steps (forgot password) ───
.steps {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
  padding: 0 16px;

  .step-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;

    .step-circle {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: $color-border;
      color: #fff;
      font-size: 14px;
      font-weight: $font-weight-semibold;
      transition: all $transition-normal;
    }

    .step-label {
      font-size: $font-size-small;
      color: $color-text-placeholder;
      transition: color $transition-normal;
    }

    &.active {
      .step-circle {
        background: $color-primary;
        box-shadow: 0 2px 8px rgba(76, 175, 80, 0.4);
      }
      .step-label {
        color: $color-primary-dark;
        font-weight: $font-weight-medium;
      }
    }

    &.done {
      .step-circle { background: $color-primary-dark; }
      .step-label { color: $color-primary-dark; }
    }
  }

  .step-line {
    flex: 1;
    height: 2px;
    background: $color-border;
    margin: 0 12px 22px;
    transition: background $transition-normal;

    &.active { background: $color-primary; }
  }
}

// ─── Auth button ───
.auth-btn {
  width: 100%;
  border-radius: $radius-md;
  height: 42px;
  font-size: 15px;
  font-weight: $font-weight-medium;
  transition: all $transition-normal;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
  }

  &:active { transform: translateY(0); }
}

// ─── Footer links ───
.dialog-footer-links {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16px;
  border-top: 1px solid $color-border;
  margin-top: 4px;

  .link {
    font-size: $font-size-body;
    color: $color-text-secondary;
    cursor: pointer;
    transition: color $transition-fast;

    &:hover { color: $color-primary; }

    .highlight {
      color: $color-primary;
      font-weight: $font-weight-medium;
    }
  }
}

// ─── Agreement ───
.dialog-agreement {
  text-align: center;
  margin-top: 16px;
  font-size: $font-size-small;
  color: $color-text-placeholder;

  a {
    color: $color-text-secondary;
    text-decoration: underline;
    &:hover { color: $color-primary; }
  }
}

// ─── Element Plus overrides ───
:deep(.el-form-item__label) {
  font-weight: $font-weight-medium;
  color: $color-text-primary;
}

:deep(.el-input__wrapper) {
  border-radius: $radius-md;
  transition: all $transition-fast;

  &:hover {
    box-shadow: 0 0 0 1px $color-primary-light inset;
  }

  &.is-focus {
    box-shadow: 0 0 0 1px $color-primary inset !important;
  }
}

:deep(.el-input__prefix .el-icon) {
  color: $color-text-placeholder;
  font-size: 18px;
}
</style>
