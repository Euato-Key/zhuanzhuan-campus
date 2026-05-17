<script setup lang="ts">
import { Unlock } from '@element-plus/icons-vue'

defineProps<{
  blockedByMe: boolean
  blockedByOther: boolean
}>()

defineEmits<{
  unblock: []
}>()
</script>

<template>
  <div class="block-banner">
    <template v-if="blockedByMe">
      <el-alert
        title="您已拉黑该用户"
        type="warning"
        :closable="false"
        show-icon
      >
        <template #default>
          <el-button type="primary" size="small" :icon="Unlock" @click="$emit('unblock')">
            取消拉黑
          </el-button>
        </template>
      </el-alert>
    </template>
    <template v-else-if="blockedByOther">
      <el-alert
        title="对方已拉黑您，无法发送消息"
        type="error"
        :closable="false"
        show-icon
      />
    </template>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.block-banner {
  padding: $spacing-sm $spacing-md;
}
</style>