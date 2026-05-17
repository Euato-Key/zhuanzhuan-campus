<script setup lang="ts">
import { ref, watch } from 'vue'
import { getMyProducts, getUserProducts, type UserProductItem, type MyProductItem } from '@/api/modules/product'
import { getOssUrl } from '@/utils/oss'
import { showError } from '@/utils/error'

const props = defineProps<{
  visible: boolean
  otherUserId: number
}>()

const emit = defineEmits<{
  'update:visible': [val: boolean]
  select: [productId: string]
}>()

const activeTab = ref('mine')
const myProducts = ref<MyProductItem[]>([])
const otherProducts = ref<UserProductItem[]>([])
const loading = ref(false)

async function loadMyProducts() {
  loading.value = true
  try {
    const res = await getMyProducts({ page: 1, pageSize: 50, status: 'active' })
    if (res.data.code === 200) {
      myProducts.value = res.data.data.list
    }
  } catch (err) {
    showError(err, '获取我的商品失败')
  } finally {
    loading.value = false
  }
}

async function loadOtherProducts() {
  loading.value = true
  try {
    const res = await getUserProducts(props.otherUserId, { page: 1, pageSize: 50 })
    if (res.data.code === 200) {
      otherProducts.value = res.data.data.list
    }
  } catch (err) {
    showError(err, '获取对方商品失败')
  } finally {
    loading.value = false
  }
}

function handleSelect(productId: string) {
  emit('select', productId)
  emit('update:visible', false)
}

watch(() => props.visible, (val) => {
  if (val) {
    activeTab.value = 'mine'
    loadMyProducts()
  }
})

watch(activeTab, (tab) => {
  if (tab === 'mine') loadMyProducts()
  else loadOtherProducts()
})
</script>

<template>
  <el-dialog
    :model-value="visible"
    title="选择商品"
    width="480px"
    @update:model-value="$emit('update:visible', $event)"
  >
    <el-tabs v-model="activeTab">
      <el-tab-pane label="我的宝贝" name="mine">
        <div v-loading="loading" class="picker-list">
          <el-empty v-if="!loading && !myProducts.length" description="暂无在售商品" :image-size="60" />
          <div v-for="item in myProducts" :key="item.id" class="picker-item">
            <el-image :src="item.images?.[0] ? getOssUrl(item.images[0]) : undefined" class="picker-thumb" fit="cover">
              <template #error><div class="thumb-placeholder">?</div></template>
            </el-image>
            <div class="picker-info">
              <span class="picker-name">{{ item.name }}</span>
              <span class="picker-price">¥{{ item.currentPrice }}</span>
            </div>
            <el-button size="small" type="primary" plain @click="handleSelect(item.id)">选择</el-button>
          </div>
        </div>
      </el-tab-pane>
      <el-tab-pane label="TA的宝贝" name="other">
        <div v-loading="loading" class="picker-list">
          <el-empty v-if="!loading && !otherProducts.length" description="对方暂无在售商品" :image-size="60" />
          <div v-for="item in otherProducts" :key="item.id" class="picker-item">
            <el-image :src="item.images?.[0] ? getOssUrl(item.images[0]) : undefined" class="picker-thumb" fit="cover">
              <template #error><div class="thumb-placeholder">?</div></template>
            </el-image>
            <div class="picker-info">
              <span class="picker-name">{{ item.name }}</span>
              <span class="picker-price">¥{{ item.currentPrice }}</span>
            </div>
            <el-button size="small" type="primary" plain @click="handleSelect(item.id)">选择</el-button>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
  </el-dialog>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.picker-list {
  min-height: 120px;
  max-height: 400px;
  overflow-y: auto;
}

.picker-item {
  display: flex;
  align-items: center;
  gap: $spacing-md;
  padding: $spacing-sm 0;

  & + & {
    border-top: 1px solid $color-border-light;
  }
}

.picker-thumb {
  width: 60px;
  height: 60px;
  border-radius: $radius-sm;
  flex-shrink: 0;
}

.thumb-placeholder {
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: $color-bg-page;
  color: $color-text-placeholder;
  font-size: $font-size-body;
}

.picker-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
}

.picker-name {
  font-size: $font-size-body;
  color: $color-text-primary;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.picker-price {
  font-size: $font-size-small;
  color: $color-primary;
  font-weight: $font-weight-medium;
}
</style>