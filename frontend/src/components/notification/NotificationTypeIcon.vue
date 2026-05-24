<template>
  <span
    class="notification-type-icon"
    :style="{ backgroundColor: bgColor, width: size + 'px', height: size + 'px' }"
  >
    <el-icon :size="iconSize" color="#fff">
      <component :is="iconComponent" />
    </el-icon>
  </span>
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue'
import {
  Bell, Goods, ShoppingBag, ChatDotRound, Comment, Star,
} from '@element-plus/icons-vue'
import type { NotificationType } from '@/api/modules/notification'
import { NOTIFICATION_TYPE_COLORS, NOTIFICATION_TYPE_ICONS } from '@/api/modules/notification'

const props = withDefaults(defineProps<{
  type: NotificationType
  size?: number
}>(), {
  size: 36,
})

const ICON_MAP: Record<string, Component> = {
  Bell,
  Goods,
  ShoppingBag,
  ChatDotRound,
  Comment,
  Star,
}

const iconComponent = computed(() => ICON_MAP[NOTIFICATION_TYPE_ICONS[props.type]])

const bgColor = computed(() => NOTIFICATION_TYPE_COLORS[props.type])

const iconSize = computed(() => Math.round(props.size * 0.5))
</script>

<style scoped lang="scss">
.notification-type-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  flex-shrink: 0;
}
</style>
