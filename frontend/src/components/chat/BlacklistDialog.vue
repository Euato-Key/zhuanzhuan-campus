<script setup lang="ts">
import { ref } from 'vue'
import { Unlock } from '@element-plus/icons-vue'
import type { BlacklistItem } from '@/api/modules/chat'
import { useChatStore } from '@/stores/chat'
import { getOssUrl } from '@/utils/oss'

defineProps<{
  visible: boolean
}>()

defineEmits<{
  'update:visible': [val: boolean]
}>()

const chatStore = useChatStore()
const blacklist = ref<BlacklistItem[]>([])
const loading = ref(false)

async function loadBlacklist() {
  loading.value = true
  blacklist.value = await chatStore.fetchBlacklist()
  loading.value = false
}

async function handleUnblock(userId: number) {
  await chatStore.unblockOtherUser(userId)
  await loadBlacklist()
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    title="黑名单管理"
    width="400px"
    @update:model-value="$emit('update:visible', $event)"
    @open="loadBlacklist"
  >
    <div v-loading="loading" class="blacklist-content">
      <div v-if="!blacklist.length" class="empty-text">暂无黑名单</div>
      <div v-for="item in blacklist" :key="item.id" class="blacklist-item">
        <el-avatar :size="36" :src="item.blockedUser.avatar ? getOssUrl(item.blockedUser.avatar) : undefined">
          {{ item.blockedUser.username?.charAt(0) || '?' }}
        </el-avatar>
        <span class="blocked-name">{{ item.blockedUser.username }}</span>
        <el-button size="small" type="primary" plain :icon="Unlock" @click="handleUnblock(item.blockedUser.id)">
          取消拉黑
        </el-button>
      </div>
    </div>
  </el-dialog>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.blacklist-content {
  min-height: 100px;
}

.empty-text {
  text-align: center;
  color: $color-text-placeholder;
  padding: $spacing-xl;
}

.blacklist-item {
  display: flex;
  align-items: center;
  gap: $spacing-md;
  padding: $spacing-sm 0;

  & + & {
    border-top: 1px solid $color-border-light;
  }
}

.blocked-name {
  flex: 1;
  font-size: $font-size-body;
  color: $color-text-primary;
}
</style>