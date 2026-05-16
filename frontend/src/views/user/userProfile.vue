<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Back } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { getOssUrl } from '@/utils/oss'
import { formatDate } from '@/utils/format'
import AppLayout from '@/components/layout/AppLayout.vue'
import { useUserStore } from '@/stores/user'
import { useAuthDialog } from '@/composables/useAuthDialog'
import api from '@/api/index'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const authDialog = useAuthDialog()

const loading = ref(true)
const user = ref<{
  id: number
  username: string
  avatar: string | null
  bio: string | null
  school: string | null
  campus: string | null
  creditScore: number
  createdAt: string
} | null>(null)

const products = ref<{
  id: string
  name: string
  images: string[]
  currentPrice: number
  status: string
}[]>([])

const productsLoading = ref(false)
const productsTotal = ref(0)

// 是否是自己的主页
const isOwnProfile = computed(() => {
  return userStore.user && user.value && userStore.user.id === user.value.id
})

// 用户头像
const userAvatar = computed(() => {
  if (!user.value?.avatar) return undefined
  return getOssUrl(user.value.avatar)
})

// 用户名首字母（安全处理空值）
const userInitial = computed(() => {
  return user.value?.username?.charAt(0) || '?'
})

// 格式化加入时间
const joinTime = computed(() => {
  if (!user.value?.createdAt) return ''
  return formatDate(user.value.createdAt, 'date')
})

// 获取用户信息
async function fetchUser() {
  loading.value = true
  try {
    const userId = route.params.id
    const res = await api.get(`/users/${userId}`)
    if (res.data.code === 200) {
      user.value = res.data.data
    } else {
      ElMessage.error('用户不存在')
      router.push({ name: 'Home' })
    }
  } catch (err) {
    console.error('获取用户信息失败', err)
    ElMessage.error('获取用户信息失败')
    router.push({ name: 'Home' })
  } finally {
    loading.value = false
  }
}

// 获取用户在售商品
async function fetchUserProducts() {
  if (!user.value) return
  productsLoading.value = true
  try {
    const res = await api.get(`/products/user/${user.value.id}`, {
      params: { status: 'active', page: 1, pageSize: 12 }
    })
    if (res.data.code === 200) {
      products.value = res.data.data.list
      productsTotal.value = res.data.data.total
    }
  } catch (err) {
    console.error('获取用户商品失败', err)
  } finally {
    productsLoading.value = false
  }
}

// 联系卖家
function contactUser() {
  if (!userStore.isLoggedIn) {
    authDialog.open('login')
    return
  }
  if (!user.value) return
  router.push({
    name: 'Chat',
    query: { userId: user.value.id },
  })
}

// 查看商品详情
function viewProduct(productId: string) {
  router.push({ name: 'ProductDetail', params: { id: productId } })
}

// 返回
function goBack() {
  router.back()
}

onMounted(() => {
  fetchUser().then(() => {
    fetchUserProducts()
  })
})
</script>

<template>
  <AppLayout>
    <div class="user-profile-page" v-loading="loading">
      <template v-if="user">
        <!-- 返回按钮 -->
        <div class="back-nav">
          <el-button link class="back-btn" @click="goBack">
            <el-icon><Back /></el-icon>
            返回
          </el-button>
        </div>

        <!-- 用户信息卡片 -->
        <div class="profile-card">
          <div class="avatar-section">
            <el-avatar :size="100" :src="userAvatar">
              {{ userInitial }}
            </el-avatar>
          </div>

          <div class="info-section">
            <h1 class="username">{{ user.username }}</h1>

            <div class="meta-row">
              <el-tag v-if="user.school" type="info">{{ user.school }}</el-tag>
              <el-tag v-if="user.campus">{{ user.campus }}</el-tag>
              <span class="credit">
                <el-icon><i class="el-icon-star"></i></el-icon>
                信用分: {{ user.creditScore }}
              </span>
            </div>

            <div v-if="user.bio" class="bio">
              {{ user.bio }}
            </div>

            <div class="join-time">
              加入时间: {{ joinTime }}
            </div>
          </div>

          <div class="action-section" v-if="!isOwnProfile">
            <el-button type="primary" @click="contactUser">
              联系TA
            </el-button>
          </div>
        </div>

        <!-- 用户在售商品 -->
        <div class="products-section">
          <h2>在售商品 <span class="count">({{ productsTotal }}件)</span></h2>

          <div class="products-grid" v-loading="productsLoading">
            <div
              v-for="product in products"
              :key="product.id"
              class="product-card"
              @click="viewProduct(product.id)"
            >
              <div class="product-image">
                <img :src="product.images?.[0] || '/placeholder.png'" alt="商品图片" />
              </div>
              <div class="product-info">
                <h3 class="product-name">{{ product.name }}</h3>
                <span class="product-price">¥{{ product.currentPrice }}</span>
              </div>
            </div>

            <el-empty v-if="!productsLoading && products.length === 0" description="暂无在售商品" />
          </div>
        </div>
      </template>
    </div>
  </AppLayout>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.user-profile-page {
  max-width: $container-lg;
  margin: 0 auto;
  padding: $spacing-lg;
}

.back-nav {
  margin-bottom: $spacing-md;

  .back-btn {
    color: $color-text-secondary;
    font-size: $font-size-body;

    &:hover {
      color: $color-primary;
    }

    .el-icon {
      margin-right: $spacing-xs;
    }
  }
}

.profile-card {
  display: flex;
  gap: $spacing-lg;
  background: $color-bg-card;
  border-radius: $radius-lg;
  padding: $spacing-xl;
  box-shadow: $shadow-sm;
  margin-bottom: $spacing-xl;
}

.avatar-section {
  flex-shrink: 0;
}

.info-section {
  flex: 1;
}

.username {
  font-size: $font-size-h2;
  font-weight: $font-weight-semibold;
  color: $color-text-primary;
  margin: 0 0 $spacing-sm;
}

.meta-row {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  margin-bottom: $spacing-md;

  .credit {
    display: flex;
    align-items: center;
    gap: $spacing-xs;
    color: $color-primary;
    font-size: $font-size-body;
  }
}

.bio {
  color: $color-text-secondary;
  line-height: $line-height-relaxed;
  margin-bottom: $spacing-md;
  white-space: pre-wrap;
}

.join-time {
  font-size: $font-size-small;
  color: $color-text-placeholder;
}

.action-section {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.products-section {
  background: $color-bg-card;
  border-radius: $radius-lg;
  padding: $spacing-lg;
  box-shadow: $shadow-sm;

  h2 {
    font-size: $font-size-h3;
    font-weight: $font-weight-semibold;
    margin: 0 0 $spacing-lg;
    color: $color-text-primary;

    .count {
      font-size: $font-size-body;
      color: $color-text-secondary;
    }
  }
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: $spacing-md;
  min-height: 200px;
}

.product-card {
  background: $color-bg-page;
  border-radius: $radius-md;
  overflow: hidden;
  cursor: pointer;
  transition: transform $transition-fast, box-shadow $transition-fast;

  &:hover {
    transform: translateY(-2px);
    box-shadow: $shadow-md;
  }
}

.product-image {
  aspect-ratio: 1;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.product-info {
  padding: $spacing-sm;
}

.product-name {
  font-size: $font-size-body;
  font-weight: $font-weight-medium;
  color: $color-text-primary;
  margin: 0 0 $spacing-xs;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-price {
  font-size: $font-size-body;
  font-weight: $font-weight-bold;
  color: $color-error;
}

@media (max-width: $breakpoint-md) {
  .profile-card {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .meta-row {
    justify-content: center;
  }

  .action-section {
    width: 100%;
    justify-content: center;
    margin-top: $spacing-md;
  }

  .products-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>