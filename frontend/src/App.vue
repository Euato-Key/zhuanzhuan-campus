<script setup lang="ts">
import { watch } from 'vue'
import { RouterView } from 'vue-router'
import AuthDialog from '@/components/AuthDialog.vue'
import { useUserStore } from '@/stores/user'
import { useChatStore } from '@/stores/chat'
import { useNotificationStore } from '@/stores/notification'

const userStore = useUserStore()
const chatStore = useChatStore()
const notificationStore = useNotificationStore()

watch(() => userStore.isLoggedIn, (val) => {
  if (val) {
    chatStore.init()
    notificationStore.init()
  } else {
    chatStore.cleanup()
    notificationStore.cleanup()
  }
}, { immediate: true })
</script>

<template>
  <RouterView />
  <AuthDialog />
</template>

<style>
#app {
  min-height: 100vh;
}
</style>