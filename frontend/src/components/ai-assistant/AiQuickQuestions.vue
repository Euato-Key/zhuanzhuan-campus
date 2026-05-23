<script setup lang="ts">
const emit = defineEmits<{ (e: 'ask', q: string): void }>()
const questions = ['帮我看看有什么好货', '我的订单在哪', '最近有什么热门', '平台有多少用户在交易']
</script>
<template>
  <div class="quick-questions">
    <span class="quick-label">试试这样问我：</span>
    <div class="quick-tags">
      <el-tag v-for="q in questions" :key="q" class="quick-tag" @click="emit('ask', q)" type="info">
        {{ q }}
      </el-tag>
    </div>
  </div>
</template>
<style scoped>
.quick-questions { padding: 12px 16px; border-bottom: 1px solid #f0f0f0; }
.quick-label { font-size: 12px; color: #999; display: block; margin-bottom: 8px; }
.quick-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.quick-tag { cursor: pointer; }
</style>
