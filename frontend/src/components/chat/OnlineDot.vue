<script setup lang="ts">
defineProps<{
  online: boolean
}>()
</script>

<template>
  <span class="online-dot" :class="{ online, offline: !online }" />
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.online-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: $radius-full;
  border: 2px solid #fff;
  position: absolute;
  bottom: 0;
  right: 0;

  &.online {
    background: $color-success;
  }

  &.offline {
    background: $color-text-placeholder;
  }
}
</style>