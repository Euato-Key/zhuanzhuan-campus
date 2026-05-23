<script setup lang="ts">
import type { UIMessage } from '@/stores/ai-assistant'
import { getOssUrl } from '@/utils/oss'
import { useRouter } from 'vue-router'

const props = defineProps<{ msg: UIMessage }>()
const router = useRouter()

function goProduct(id: number) { router.push({ name: 'ProductDetail', params: { id } }) }
function goOrder(id: number) { router.push({ name: 'OrderDetail', params: { id } }) }
</script>
<template>
  <div :class="['msg-bubble', msg.role === 'user' ? 'user' : 'ai']">
    <!-- 文本消息 -->
    <div v-if="msg.msgType === 'text'" class="text-content">{{ msg.content }}<span v-if="msg.isLoading" class="typing-dot">▌</span></div>

    <!-- 商品卡片 -->
    <div v-if="msg.msgType === 'product_card' && msg.cardData" class="card-list">
      <div v-for="p in (msg.cardData.products || msg.cardData.product ? [msg.cardData.product || msg.cardData] : (msg.cardData || []))" 
        :key="p?.id || 0" class="product-card" @click="goProduct(p?.id)">
        <img :src="p?.images?.[0] ? getOssUrl(p.images[0]) : '/placeholder.png'" class="card-img" />
        <div class="card-info">
          <div class="card-name">{{ p?.name }}</div>
          <div class="card-price">¥{{ p?.currentPrice || p?.price }}</div>
        </div>
      </div>
    </div>

    <!-- 订单卡片 -->
    <div v-if="msg.msgType === 'order_card' && msg.cardData" class="card-list">
      <div v-for="o in (msg.cardData.orders || [])" :key="o?.orderNo" class="order-card" @click="goOrder(o?.id)">
        <div class="card-name">{{ o?.productName }}</div>
        <div class="card-price">¥{{ o?.totalPrice }}</div>
        <el-tag size="small">{{ o?.status }}</el-tag>
      </div>
    </div>

    <!-- 图表/统计 -->
    <div v-if="msg.msgType === 'chart'" class="text-content">{{ msg.content }}</div>

    <span class="msg-time">{{ new Date(msg.createdAt).toLocaleTimeString() }}</span>
  </div>
</template>
<style scoped>
.msg-bubble { margin-bottom: 16px; max-width: 85%; }
.msg-bubble.user { margin-left: auto; }
.msg-bubble.ai { margin-right: auto; }
.text-content { padding: 10px 14px; border-radius: 12px; font-size: 14px; line-height: 1.6; word-break: break-word; }
.user .text-content { background: #1890ff; color: #fff; border-bottom-right-radius: 4px; }
.ai .text-content { background: #f5f5f5; color: #333; border-bottom-left-radius: 4px; }
.typing-dot { animation: blink 1s infinite; }
@keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }
.msg-time { display: block; font-size: 11px; color: #bbb; margin-top: 4px; }
.user .msg-time { text-align: right; }
.ai .msg-time { text-align: left; }
.card-list { display: flex; flex-direction: column; gap: 8px; }
.product-card, .order-card { display: flex; align-items: center; gap: 10px; padding: 8px; background: #fff; border-radius: 8px; border: 1px solid #f0f0f0; cursor: pointer; }
.card-img { width: 48px; height: 48px; border-radius: 6px; object-fit: cover; }
.card-info { flex: 1; min-width: 0; }
.card-name { font-size: 13px; color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.card-price { font-size: 14px; font-weight: 600; color: #e4393c; }
</style>
