<script setup lang="ts">
import { computed } from 'vue'
import type { UIMessage, CardData, ProductCardItem, OrderCardItem } from '@/stores/ai-assistant'
import AiTextMessage from './AiTextMessage.vue'
import AiProductCard from './AiProductCard.vue'
import AiOrderCard from './AiOrderCard.vue'

const props = defineProps<{ msg: UIMessage }>()

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

function normalizeProducts(data: ProductCardItem[] | OrderCardItem[]): ProductCardItem[] {
  return Array.isArray(data) ? (data as ProductCardItem[]) : []
}

function normalizeOrders(data: ProductCardItem[] | OrderCardItem[]): OrderCardItem[] {
  if (Array.isArray(data)) return data as OrderCardItem[]
  return []
}

// Split content into text segments interleaved with cards
// When textBeforeLength is available (streaming), we can interleave text precisely.
// When missing (history), fall back to showing all text before all cards.
interface TextSegment { text: string; afterCard?: boolean }
const textSegments = computed<TextSegment[]>(() => {
  if (props.msg.msgType !== 'mixed' || !props.msg.cards?.length) return []
  const content = props.msg.content
  const cards = props.msg.cards!
  const hasPositions = cards.some(c => c.textBeforeLength !== undefined)

  if (!hasPositions) {
    // History message: show all text before cards
    return content.trim() ? [{ text: content.trim() }] : []
  }

  const segments: TextSegment[] = []
  for (let idx = 0; idx < cards.length; idx++) {
    const start = idx === 0 ? 0 : (cards[idx - 1].textBeforeLength ?? 0)
    const end = cards[idx].textBeforeLength ?? content.length
    const textSlice = content.slice(start, end).trim()
    if (textSlice) segments.push({ text: textSlice })
  }

  // Text after last card (streaming continuation)
  const lastEnd = cards[cards.length - 1].textBeforeLength ?? 0
  const tailText = content.slice(lastEnd).trim()
  if (tailText) segments.push({ text: tailText, afterCard: true })

  return segments
})
</script>

<template>
  <div :class="['msg-bubble', msg.role === 'user' ? 'user' : 'ai']">
    <!-- User message: plain text -->
    <template v-if="msg.role === 'user'">
      <AiTextMessage :content="msg.content" :is-loading="false" :role="msg.role" />
    </template>

    <!-- AI message: mixed (text + cards interleaved) -->
    <template v-else-if="msg.msgType === 'mixed' && msg.cards && msg.cards.length">
      <!-- History mode: text before all cards -->
      <template v-if="!msg.cards.some(c => c.textBeforeLength !== undefined)">
        <AiTextMessage
          v-if="msg.content.trim()"
          :content="msg.content.trim()"
          :is-loading="false"
          :role="msg.role"
        />
        <template v-for="(card, idx) in msg.cards" :key="'c' + idx">
          <AiProductCard v-if="card.cardType === 'product_card'" :products="normalizeProducts(card.data)" />
          <AiOrderCard v-else-if="card.cardType === 'order_card'" :orders="normalizeOrders(card.data)" />
        </template>
      </template>
      <!-- Streaming mode: interleaved text + cards -->
      <template v-else>
        <template v-for="(card, idx) in msg.cards" :key="'c' + idx">
          <AiTextMessage
            v-if="idx < textSegments.length && !textSegments[idx].afterCard && textSegments[idx].text"
            :content="textSegments[idx].text"
            :is-loading="false"
            :role="msg.role"
          />
          <AiProductCard v-if="card.cardType === 'product_card'" :products="normalizeProducts(card.data)" />
          <AiOrderCard v-else-if="card.cardType === 'order_card'" :orders="normalizeOrders(card.data)" />
        </template>
        <AiTextMessage
          v-if="textSegments.length > msg.cards.length && textSegments[msg.cards.length].text"
          :content="textSegments[msg.cards.length].text"
          :is-loading="msg.isLoading ?? false"
          :role="msg.role"
        />
      </template>
    </template>

    <!-- AI message: single card only -->
    <template v-else-if="msg.msgType === 'product_card' && msg.cardData">
      <AiProductCard :products="normalizeProducts(msg.cardData)" />
    </template>
    <template v-else-if="msg.msgType === 'order_card' && msg.cardData">
      <AiOrderCard :orders="normalizeOrders(msg.cardData)" />
    </template>

    <!-- AI message: plain text -->
    <template v-else>
      <AiTextMessage :content="msg.content" :is-loading="msg.isLoading ?? false" :role="msg.role" />
    </template>

    <span class="msg-time">{{ formatTime(msg.createdAt) }}</span>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;
.msg-bubble { margin-bottom: $spacing-md; max-width: 85%; }
.msg-bubble.user { margin-left: auto; }
.msg-bubble.ai { margin-right: auto; }
.msg-time { display: block; font-size: $font-size-tiny; color: $color-text-placeholder; margin-top: 4px; }
.user .msg-time { text-align: right; }
.ai .msg-time { text-align: left; }
</style>