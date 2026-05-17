<script setup lang="ts">
import { watch } from 'vue'
import { RouterView } from 'vue-router'
import AuthDialog from '@/components/AuthDialog.vue'
import { useUserStore } from '@/stores/user'
import { useChatStore } from '@/stores/chat'

const userStore = useUserStore()
const chatStore = useChatStore()

watch(() => userStore.isLoggedIn, (val) => {
  if (val) chatStore.init()
  else chatStore.cleanup()
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