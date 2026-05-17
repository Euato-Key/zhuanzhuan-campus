<script setup lang="ts">
import { computed } from 'vue'
import { Check } from '@element-plus/icons-vue'

const props = defineProps<{
  readAt: string | null | object
}>()

const isRead = computed(() => typeof props.readAt === 'string' && props.readAt !== '')
</script>

<template>
  <span class="read-status" :class="{ read: isRead }">
    <el-icon :size="12"><Check /></el-icon>
    <el-icon v-if="isRead" :size="12"><Check /></el-icon>
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