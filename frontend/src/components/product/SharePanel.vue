<template>
  <el-popover
    placement="top"
    :width="280"
    trigger="click"
    :show-after="0"
    @show="onShow"
  >
    <template #reference>
      <el-button type="primary" plain size="large">
        <el-icon><Share /></el-icon>分享
      </el-button>
    </template>

    <div class="share-panel">
      <div class="share-panel__title">分享商品</div>

      <div class="share-panel__items">
        <div class="share-panel__item" @click="handleCopy">
          <div class="share-panel__icon share-panel__icon--copy">
            <img :src="linkIcon" alt="复制链接" />
          </div>
          <span>复制链接</span>
        </div>

        <div class="share-panel__item" @click="handleWeibo">
          <div class="share-panel__icon share-panel__icon--weibo">
            <img :src="weiboIcon" alt="微博" />
          </div>
          <span>微博</span>
        </div>

        <div class="share-panel__item" @click="handleCopyWithTip('微信')">
          <div class="share-panel__icon share-panel__icon--wechat">
            <img :src="wechatIcon" alt="微信" />
          </div>
          <span>微信</span>
        </div>

        <div class="share-panel__item" @click="handleCopyWithTip('QQ')">
          <div class="share-panel__icon share-panel__icon--qq">
            <img :src="qqIcon" alt="QQ" />
          </div>
          <span>QQ</span>
        </div>
      </div>

      <div v-if="copiedTip" class="share-panel__tip">{{ copiedTip }}</div>
    </div>
  </el-popover>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Share } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { copyToClipboard, getShareUrl, shareProduct, getWeiboShareUrl } from '@/utils/share'
import type { ShareProductData } from '@/utils/share'

import linkIcon from '@/assets/icons/share/share-link.svg'
import weiboIcon from '@/assets/icons/share/share-weibo.svg'
import wechatIcon from '@/assets/icons/share/share-wechat.svg'
import qqIcon from '@/assets/icons/share/share-qq.svg'

const props = defineProps<{
  product: ShareProductData
}>()

const copiedTip = ref('')

let copiedTipTimer: ReturnType<typeof setTimeout> | null = null

function onShow() {
  copiedTip.value = ''
}

async function handleCopy() {
  const url = getShareUrl(props.product.id)
  const ok = await copyToClipboard(url)
  if (ok) {
    ElMessage.success('链接已复制')
    copiedTip.value = '链接已复制，可粘贴分享给好友'
    resetCopiedTipTimer()
  } else {
    ElMessage.error('复制失败，请手动复制地址栏链接')
  }
}

function handleCopyWithTip(platform: string) {
  const url = getShareUrl(props.product.id)
  copyToClipboard(url).then(ok => {
    if (ok) {
      copiedTip.value = `链接已复制，请打开${platform}粘贴分享`
      resetCopiedTipTimer()
    } else {
      ElMessage.error('复制失败，请手动复制地址栏链接')
    }
  })
}

function handleWeibo() {
  const url = getWeiboShareUrl(props.product)
  window.open(url, '_blank', 'width=600,height=500')
}

function resetCopiedTipTimer() {
  if (copiedTipTimer) clearTimeout(copiedTipTimer)
  copiedTipTimer = setTimeout(() => {
    copiedTip.value = ''
  }, 4000)
}

async function handleNativeShare() {
  const ok = await shareProduct(props.product)
  return ok
}

defineExpose({ handleNativeShare })
</script>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.share-panel {
  &__title {
    font-size: 15px;
    font-weight: 600;
    color: $color-text-primary;
    margin-bottom: 14px;
    text-align: center;
  }

  &__items {
    display: flex;
    justify-content: space-around;
    gap: 8px;
  }

  &__item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    padding: 8px 4px;
    border-radius: $radius-md;
    transition: background-color 0.2s;

    &:hover {
      background-color: rgba($color-primary, 0.06);
    }

    span {
      font-size: 12px;
      color: $color-text-secondary;
    }
  }

  &__icon {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.2s, opacity 0.2s;

    &:hover {
      transform: scale(1.08);
    }

    &:active {
      transform: scale(0.96);
    }

    img {
      width: 36px;
      height: 36px;
    }
  }

  &__tip {
    margin-top: 12px;
    padding: 8px 12px;
    background-color: rgba($color-primary, 0.08);
    border-radius: $radius-sm;
    font-size: 12px;
    color: $color-primary;
    text-align: center;
    animation: fadeIn 0.3s ease;
  }
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
