<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <div class="home">
    <header class="header">
      <div class="container">
        <div class="header-content">
          <RouterLink to="/" class="logo">
            <span class="logo-icon">🎓</span>
            <span class="logo-text">转转校园</span>
          </RouterLink>
          <nav class="nav">
            <RouterLink to="/" class="nav-link active">首页</RouterLink>
            <RouterLink to="/products" class="nav-link">商品</RouterLink>
            <RouterLink to="/want-buy" class="nav-link">求购</RouterLink>
          </nav>
          <div class="user-actions">
            <RouterLink to="/login" class="btn-text">登录</RouterLink>
            <RouterLink to="/register" class="btn btn-primary">注册</RouterLink>
          </div>
        </div>
      </div>
    </header>

    <main class="main">
      <div class="container">
        <section class="hero">
          <div class="hero-content">
            <h1 class="hero-title">校园二手交易平台</h1>
            <p class="hero-desc">买卖二手商品，就来转转校园 · 闲置物品再利用，环保又省钱</p>
            <div class="hero-actions">
              <RouterLink to="/products" class="btn btn-primary">浏览商品</RouterLink>
              <RouterLink to="/publish" class="btn btn-secondary">发布商品</RouterLink>
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
      </div>
    </main>

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
  </div>
</template>

<style scoped lang="scss">
@import '@/assets/styles/variables';

.home {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

// 头部
.header {
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 20px;
  font-weight: 600;
  color: $color-primary;

  .logo-icon {
    font-size: 24px;
  }
}

.nav {
  display: flex;
  gap: 32px;

  .nav-link {
    font-size: 15px;
    color: $color-text-secondary;
    padding: 8px 0;
    position: relative;
    transition: color 0.2s ease;

    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      width: 0;
      height: 2px;
      background: $color-primary;
      transition: width 0.2s ease;
    }

    &:hover,
    &.active {
      color: $color-primary;

      &::after {
        width: 100%;
      }
    }
  }
}

.user-actions {
  display: flex;
  align-items: center;
  gap: 16px;

  .btn-text {
    color: $color-text-secondary;

    &:hover {
      color: $color-primary;
    }
  }
}

// 主内容区
.main {
  flex: 1;
  padding: 40px 0;
  background: $color-bg-page;
}

// Hero 区域
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

.hero-content {
  flex: 1;
  min-width: 300px;
}

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

.hero-actions {
  display: flex;
  gap: 12px;
}

.hero-stats {
  display: flex;
  gap: 40px;
}

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

// 分类区域
.categories {
  margin-bottom: 40px;
}

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

  .category-icon {
    font-size: 32px;
    display: block;
    margin-bottom: 8px;
  }

  .category-name {
    font-size: 14px;
    color: $color-text-primary;
  }
}

// 热门商品
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

    &:hover {
      text-decoration: underline;
    }
  }
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;

  @media (max-width: 992px) {
    grid-template-columns: repeat(3, 1fr);
  }

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
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
    display: flex;
    align-items: center;
    justify-content: center;

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

  .product-info {
    padding: 12px;
  }

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

// 底部
.footer {
  background: #fff;
  padding: 24px 0;
  border-top: 1px solid $color-border;
  margin-top: auto;
}

.footer-content {
  text-align: center;
}

.footer-brand {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: $color-primary;
  margin-bottom: 8px;

  .logo-icon {
    font-size: 20px;
  }
}

.footer-desc {
  font-size: 13px;
  color: $color-text-placeholder;
}

// 按钮样式覆盖
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

    &:hover {
      background: $color-primary-dark;
    }
  }

  &-secondary {
    background: #fff;
    color: $color-primary;
    border: 1px solid $color-primary;

    &:hover {
      background: $color-primary-pale;
    }
  }
}

.btn-text {
  display: inline-flex;
  align-items: center;
  padding: 8px 16px;
  color: $color-text-secondary;
  background: transparent;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(76, 175, 80, 0.08);
    color: $color-primary;
  }
}
</style>