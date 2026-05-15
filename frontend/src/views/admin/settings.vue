<script setup lang="ts">
import { ref } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import { ElMessage } from 'element-plus'

const loading = ref(false)

const settings = ref({
  siteName: '转转校园',
  siteDescription: '校园二手交易平台',
  aiEnabled: true,
  aiReviewEnabled: true,
  aiPublishEnabled: false,
  aiContextWindow: 5,
  productExpiryOptions: ['7天', '15天', '30天', '永久有效'],
  returnDeadline: 14,
})

function handleSave() {
  ElMessage.success('设置已保存')
}
</script>

<template>
  <AdminLayout>
    <div class="settings-grid">
      <!-- Basic Settings -->
      <div class="card">
        <h3 class="card-title">基础设置</h3>
        <el-form :model="settings" label-width="120px">
          <el-form-item label="站点名称">
            <el-input v-model="settings.siteName" />
          </el-form-item>
          <el-form-item label="站点描述">
            <el-input v-model="settings.siteDescription" type="textarea" :rows="3" />
          </el-form-item>
        </el-form>
      </div>

      <!-- AI Settings -->
      <div class="card">
        <h3 class="card-title">AI功能设置</h3>
        <el-form :model="settings" label-width="140px">
          <el-form-item label="启用AI功能">
            <el-switch v-model="settings.aiEnabled" />
          </el-form-item>
          <el-form-item label="AI审核商品">
            <el-switch v-model="settings.aiReviewEnabled" :disabled="!settings.aiEnabled" />
          </el-form-item>
          <el-form-item label="AI辅助发布">
            <el-switch v-model="settings.aiPublishEnabled" :disabled="!settings.aiEnabled" />
          </el-form-item>
          <el-form-item label="AI上下文窗口">
            <el-input-number
              v-model="settings.aiContextWindow"
              :min="3"
              :max="20"
              :disabled="!settings.aiEnabled"
            />
            <span class="form-tip">条消息</span>
          </el-form-item>
        </el-form>
      </div>

      <!-- Order Settings -->
      <div class="card">
        <h3 class="card-title">订单设置</h3>
        <el-form :model="settings" label-width="140px">
          <el-form-item label="商品有效期选项">
            <el-select v-model="settings.productExpiryOptions" multiple style="width: 100%">
              <el-option label="7天" value="7天" />
              <el-option label="15天" value="15天" />
              <el-option label="30天" value="30天" />
              <el-option label="永久有效" value="永久有效" />
            </el-select>
          </el-form-item>
          <el-form-item label="退货申请期限">
            <el-input-number v-model="settings.returnDeadline" :min="1" :max="30" />
            <span class="form-tip">天内可申请退货</span>
          </el-form-item>
        </el-form>
      </div>
    </div>

    <!-- Save Button -->
    <div class="save-bar">
      <el-button type="primary" size="large" :loading="loading" @click="handleSave">
        保存设置
      </el-button>
    </div>
  </AdminLayout>
</template>

<style scoped lang="scss">
@import '@/assets/styles/variables';

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
  justify-content: center;
  padding: 24px;
  background: #fff;
  border-radius: $radius-lg;
  box-shadow: $shadow-sm;
}

@media (max-width: 768px) {
  .settings-grid { grid-template-columns: 1fr; }
}
</style>