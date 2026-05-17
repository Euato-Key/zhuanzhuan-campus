<script setup lang="ts">
import { Check } from '@element-plus/icons-vue'

defineProps<{
  readAt: string | null
}>()
</script>

<template>
  <span class="read-status" :class="{ read: !!readAt }">
    <el-icon :size="12"><Check /></el-icon>
    <el-icon v-if="readAt" :size="12"><Check /></el-icon>
  </span>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.read-status {
  display: inline-flex;
  align-items: center;
  gap: 0;
  color: $color-text-placeholder;

  &.read {
    color: $color-success;
  }
}
</style>