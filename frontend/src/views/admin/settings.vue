<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import { ElMessage } from 'element-plus'
import { getSettings, updateSettings, type SystemSettings } from '@/api/modules/settings'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const loading = ref(false)
const isSuperAdmin = ref(false)

const settings = ref<SystemSettings>({
  ai_audit_enabled: false,
  ai_audit_first_publish: false,
  ai_audit_edit: false,
  ai_publish_enabled: false,
  ai_context_window: 5,
})

async function loadSettings() {
  loading.value = true
  try {
    const res = await getSettings()
    if (res.data.code === 200 && res.data.data) {
      settings.value = res.data.data
    }
  } catch {
    ElMessage.warning('加载设置失败，已使用默认值')
  } finally {
    loading.value = false
    // 检查是否为超级管理员（只有超级管理员可以编辑）
    isSuperAdmin.value = userStore.user?.role === 'super_admin'
  }
}

async function handleSave() {
  loading.value = true
  try {
    await updateSettings(settings.value)
    ElMessage.success('设置已保存')
  } catch (err: any) {
    const msg = err?.response?.data?.message || '保存失败'
    ElMessage.error(msg)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadSettings()
})
</script>

<template>
  <AdminLayout>
    <div v-loading="loading" class="settings-grid">
      <!-- AI Audit Settings -->
      <div class="card">
        <h3 class="card-title">AI审核设置</h3>
        <el-form :model="settings" label-width="140px" :disabled="!isSuperAdmin">
          <el-form-item label="启用AI审核">
            <el-switch v-model="settings.ai_audit_enabled" />
            <span class="form-tip">总开关，关闭后所有AI审核功能停用</span>
          </el-form-item>
          <el-form-item label="首次发布审核">
            <el-switch
              v-model="settings.ai_audit_first_publish"
              :disabled="!settings.ai_audit_enabled"
            />
            <span class="form-tip">用户首次发布商品时自动AI审核</span>
          </el-form-item>
          <el-form-item label="修改重审">
            <el-switch
              v-model="settings.ai_audit_edit"
              :disabled="!settings.ai_audit_enabled"
            />
            <span class="form-tip">用户修改需重审的商品信息时自动AI审核</span>
          </el-form-item>
        </el-form>
      </div>

      <!-- AI Feature Settings -->
      <div class="card">
        <h3 class="card-title">AI功能设置</h3>
        <el-form :model="settings" label-width="140px" :disabled="!isSuperAdmin">
          <el-form-item label="AI辅助发布">
            <el-switch v-model="settings.ai_publish_enabled" />
            <span class="form-tip">用户在发布商品时可使用AI识别辅助填写</span>
          </el-form-item>
          <el-form-item label="AI上下文窗口">
            <el-input-number
              v-model="settings.ai_context_window"
              :min="3"
              :max="20"
            />
            <span class="form-tip">条消息（影响AI助手的上下文记忆量）</span>
          </el-form-item>
        </el-form>
      </div>

      <!-- System Info Card -->
      <div class="card">
        <h3 class="card-title">系统信息</h3>
        <el-form label-width="140px">
          <el-form-item label="审核机制说明">
            <div class="info-text">
              <p><strong>AI审核流程：</strong></p>
              <ul>
                <li>用户发布/修改商品 → 进入"待审核"状态</li>
                <li>AI审核启用时自动审核 → 通过则上架，不通过则退回</li>
                <li>AI审核禁用时 → 等待管理员手动审核</li>
                <li>AI审核失败时 → 保持"待审核"状态，不阻塞流程</li>
              </ul>
              <p><strong>审核重试规则：</strong></p>
              <ul>
                <li>每个商品最多重新提交审核3次</li>
                <li>第3次审核不通过后，商品永久变为"审核失败"状态</li>
                <li>管理员可在后台手动处理所有待审核商品</li>
              </ul>
              <p class="hint-text">提示：当前登录角色为{{ userStore.user?.role === 'super_admin' ? '超级管理员' : userStore.user?.role === 'admin' ? '管理员' : '普通用户' }}。{{ isSuperAdmin ? '您可以编辑以下设置。' : '仅超级管理员可以编辑设置，您只能查看。' }}</p>
            </div>
          </el-form-item>
        </el-form>
      </div>
    </div>

    <!-- Save Button -->
    <div class="save-bar">
      <el-button
        type="primary"
        size="large"
        :loading="loading"
        :disabled="!isSuperAdmin"
        @click="handleSave"
      >
        保存设置
      </el-button>
      <span v-if="!isSuperAdmin" class="save-tip">仅超级管理员可修改配置</span>
    </div>
  </AdminLayout>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.settings-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
  margin-bottom: 24px;
}

.card {
  background: #fff;
  border-radius: $radius-lg;
  padding: 24px;
  box-shadow: $shadow-sm;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: $color-text-primary;
  margin: 0 0 20px 0;
  padding-bottom: 16px;
  border-bottom: 1px solid $color-border;
}

.form-tip {
  margin-left: 12px;
  font-size: 13px;
  color: $color-text-secondary;
}

.save-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 24px;
  background: #fff;
  border-radius: $radius-lg;
  box-shadow: $shadow-sm;
}

.save-tip {
  font-size: 13px;
  color: $color-text-secondary;
}

.info-text {
  font-size: 13px;
  color: $color-text-secondary;
  line-height: 1.8;

  p {
    margin: 8px 0 4px;
  }

  ul {
    margin: 0;
    padding-left: 16px;

    li {
      margin-bottom: 4px;
    }
  }

  .hint-text {
    margin-top: 12px;
    padding: 8px 12px;
    background: #e6f7ff;
    border-radius: 4px;
    color: #1890ff;
    font-size: 12px;
  }
}

@media (max-width: 768px) {
  .settings-grid { grid-template-columns: 1fr; }
}
</style>
