<script setup lang="ts">
</script>

<template>
  <footer class="footer">
    <div class="container">
      <div class="footer-content">
        <div class="footer-brand">
          <span class="logo-icon">🎓</span>
          <span>转转校园</span>
        </div>
        <p class="footer-desc">校园二手交易平台 · 让闲置物品找到新主人</p>
      </div>
    </div>
  </footer>
</template>

<style scoped lang="scss">
@import '@/assets/styles/variables';

.footer {
  background: #fff;
  padding: 24px 0;
  border-top: 1px solid $color-border;
  margin-top: auto;
}

.footer-content { text-align: center; }

.footer-brand {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: $color-primary;
  margin-bottom: 8px;

  .logo-icon { font-size: 20px; }
}

.footer-desc {
  font-size: 13px;
  color: $color-text-placeholder;
}
</style>
