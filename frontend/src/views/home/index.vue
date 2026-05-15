<script setup lang="ts">
import { RouterLink, useRouter } from 'vue-router'
import AppLayout from '@/components/layout/AppLayout.vue'
import { useUserStore } from '@/stores/user'
import { useAuthDialog } from '@/composables/useAuthDialog'

const router = useRouter()
const userStore = useUserStore()
const authDialog = useAuthDialog()
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

    <section class="categories">
      <h3 class="section-title">商品分类</h3>
      <div class="category-grid">
        <RouterLink to="/products?category=books" class="category-item">
          <span class="category-icon">📚</span>
          <span class="category-name">书籍</span>
        </RouterLink>
        <RouterLink to="/products?category=electronics" class="category-item">
          <span class="category-icon">📱</span>
          <span class="category-name">电子产品</span>
        </RouterLink>
        <RouterLink to="/products?category=daily" class="category-item">
          <span class="category-icon">🛋️</span>
          <span class="category-name">生活用品</span>
        </RouterLink>
        <RouterLink to="/products?category=fashion" class="category-item">
          <span class="category-icon">👕</span>
          <span class="category-name">服饰鞋包</span>
        </RouterLink>
        <RouterLink to="/products?category=sports" class="category-item">
          <span class="category-icon">⚽</span>
          <span class="category-name">运动户外</span>
        </RouterLink>
        <RouterLink to="/products?category=stationery" class="category-item">
          <span class="category-icon">✏️</span>
          <span class="category-name">文具办公</span>
        </RouterLink>
      </div>
    </section>

    <section class="hot-products">
      <div class="section-header">
        <h3 class="section-title">热门商品</h3>
        <RouterLink to="/products" class="more-link">查看更多 →</RouterLink>
      </div>
      <div class="product-grid">
        <div class="product-card" v-for="i in 8" :key="i">
          <div class="product-image">
            <span class="product-tag">热门</span>
          </div>
          <div class="product-info">
            <div class="product-price">¥{{ (Math.random() * 500 + 20).toFixed(0) }}</div>
            <div class="product-title">商品名称商品名称商品名称</div>
            <div class="product-meta">
              <span class="product-school">清华大学</span>
              <span class="product-time">2小时前</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  </AppLayout>
</template>

<style scoped lang="scss">
@import '@/assets/styles/variables';

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

.product-card {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.25s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  }

  .product-image {
    width: 100%;
    aspect-ratio: 1;
    background: linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%);
    position: relative;

    .product-tag {
      position: absolute;
      top: 12px;
      left: 12px;
      background: $color-accent-orange;
      color: #fff;
      font-size: 12px;
      padding: 4px 10px;
      border-radius: 4px;
    }
  }

  .product-info { padding: 12px; }

  .product-price {
    font-size: 18px;
    font-weight: 600;
    color: $color-error;
    font-family: $font-family-mono;
    margin-bottom: 6px;
  }

  .product-title {
    font-size: 14px;
    color: $color-text-primary;
    line-height: 1.4;
    margin-bottom: 8px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .product-meta {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: $color-text-placeholder;
  }
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