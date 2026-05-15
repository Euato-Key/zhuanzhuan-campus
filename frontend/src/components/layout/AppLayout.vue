<script setup lang="ts">
import AppHeader from './AppHeader.vue'
import AppFooter from './AppFooter.vue'
</script>

<template>
  <div class="layout">
    <AppHeader />
    <main class="main">
      <div class="container">
        <slot />
      </div>
    </main>
    <AppFooter />
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main {
  flex: 1;
  padding: 40px 0;
  background: $color-bg-page;
}
</style>