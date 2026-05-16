<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import AppLayout from '@/components/layout/AppLayout.vue'
import ProductCard from '@/components/product/ProductCard.vue'
import { useUserStore } from '@/stores/user'
import { useAuthDialog } from '@/composables/useAuthDialog'
import { getProductList, getCategoryTree, type ProductListItem, type Category } from '@/api/product'
import { showError } from '@/utils/error'

const router = useRouter()
const userStore = useUserStore()
const authDialog = useAuthDialog()

const categories = ref<Category[]>([])
const hotProducts = ref<ProductListItem[]>([])
const loading = ref(false)

async function fetchData() {
  loading.value = true
  try {
    // 并行获取分类和热门商品
    const [catRes, prodRes] = await Promise.all([
      getCategoryTree(),
      getProductList({ sortBy: 'favorite', sortOrder: 'desc', pageSize: 8 })
    ])

    if (catRes.data.code === 200) {
      categories.value = catRes.data.data.slice(0, 6)
    }
    if (prodRes.data.code === 200) {
      hotProducts.value = prodRes.data.data.list
    }
  } catch (err) {
    showError(err, '获取数据失败')
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)
</script>

<template>
  <AppLayout>
    <section class="hero">
      <div class="hero-content">
        <h1 class="hero-title">校园二手交易平台</h1>
        <p class="hero-desc">买卖二手商品，就来转转校园 · 闲置物品再利用，环保又省钱</p>
        <div class="hero-actions">
          <RouterLink to="/products" class="btn btn-primary">浏览商品</RouterLink>
          <a v-if="userStore.isLoggedIn" class="btn btn-secondary" @click="router.push('/publish')">发布商品</a>
          <a v-else class="btn btn-secondary" @click="authDialog.open('login')">发布商品</a>
        </div>
      </div>
      <div class="hero-stats">
        <div class="stat-item">
          <span class="stat-value">10K+</span>
          <span class="stat-label">注册用户</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">5K+</span>
          <span class="stat-label">商品数量</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">8K+</span>
          <span class="stat-label">成功交易</span>
        </div>
      </div>
    </section>

    <section class="categories" v-loading="loading">
      <h3 class="section-title">商品分类</h3>
      <div class="category-grid">
        <RouterLink
          v-for="cat in categories"
          :key="cat.id"
          :to="`/products?categoryId=${cat.id}`"
          class="category-item"
        >
          <span class="category-icon">{{ cat.icon || '📦' }}</span>
          <span class="category-name">{{ cat.name }}</span>
        </RouterLink>
        <RouterLink v-if="categories.length === 0" to="/products" class="category-item">
          <span class="category-icon">📦</span>
          <span class="category-name">全部商品</span>
        </RouterLink>
      </div>
    </section>

    <section class="hot-products">
      <div class="section-header">
        <h3 class="section-title">热门商品</h3>
        <RouterLink to="/products" class="more-link">查看更多 →</RouterLink>
      </div>
      <div class="product-grid" v-loading="loading">
        <ProductCard
          v-for="product in hotProducts"
          :key="product.id"
          :product="product"
        />
        <el-empty v-if="!loading && hotProducts.length === 0" description="暂无热门商品" />
      </div>
    </section>
  </AppLayout>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

// ─── Hero ───
.hero {
  background: linear-gradient(135deg, $color-primary-pale 0%, #fff 100%);
  border-radius: 16px;
  padding: 60px 40px;
  margin-bottom: 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 40px;
}

.hero-content { flex: 1; min-width: 300px; }

.hero-title {
  font-size: 36px;
  font-weight: 700;
  color: $color-text-primary;
  margin-bottom: 12px;
}

.hero-desc {
  font-size: 16px;
  color: $color-text-secondary;
  margin-bottom: 24px;
}

.hero-actions { display: flex; gap: 12px; }

.hero-stats { display: flex; gap: 40px; }

.stat-item {
  text-align: center;

  .stat-value {
    display: block;
    font-size: 28px;
    font-weight: 700;
    color: $color-primary;
    font-family: $font-family-mono;
  }

  .stat-label {
    font-size: 13px;
    color: $color-text-placeholder;
  }
}

// ─── Categories ───
.categories { margin-bottom: 40px; }

.section-title {
  font-size: 20px;
  font-weight: 600;
  color: $color-text-primary;
  margin-bottom: 20px;
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 16px;

  @media (max-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
  }
}

.category-item {
  background: #fff;
  padding: 24px 16px;
  text-align: center;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.25s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  }

  .category-icon { font-size: 32px; display: block; margin-bottom: 8px; }
  .category-name { font-size: 14px; color: $color-text-primary; }
}

// ─── Hot products ───
.hot-products {
  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
  }

  .more-link {
    font-size: 14px;
    color: $color-primary;
    &:hover { text-decoration: underline; }
  }
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;

  @media (max-width: 992px) { grid-template-columns: repeat(3, 1fr); }
  @media (max-width: 768px) { grid-template-columns: repeat(2, 1fr); }
}

// ─── Buttons ───
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &-primary {
    background: $color-primary;
    color: #fff;
    &:hover { background: $color-primary-dark; }
  }

  &-secondary {
    background: #fff;
    color: $color-primary;
    border: 1px solid $color-primary;
    &:hover { background: $color-primary-pale; }
  }
}
</style>