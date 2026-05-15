<script setup lang="ts">
import { RouterView } from 'vue-router'
import AuthDialog from '@/components/AuthDialog.vue'
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