<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <div class="home">
    <header class="header">
      <div class="container">
        <div class="header-content">
          <h1 class="logo">转转校园</h1>
          <nav class="nav">
            <RouterLink to="/">首页</RouterLink>
            <RouterLink to="/products">商品</RouterLink>
            <RouterLink to="/want-buy">求购</RouterLink>
          </nav>
          <div class="user-actions">
            <RouterLink to="/login">登录</RouterLink>
            <RouterLink to="/register" class="btn-primary">注册</RouterLink>
          </div>
        </div>
      </div>
    </header>

    <main class="main">
      <div class="container">
        <section class="hero">
          <h2>校园二手交易平台</h2>
          <p>买卖二手商品，就来转转校园</p>
        </section>

        <section class="categories">
          <h3>商品分类</h3>
          <div class="category-grid">
            <div class="category-item">书籍</div>
            <div class="category-item">电子产品</div>
            <div class="category-item">生活用品</div>
            <div class="category-item">服饰鞋包</div>
            <div class="category-item">运动户外</div>
            <div class="category-item">文具办公</div>
          </div>
        </section>
      </div>
    </main>
  </div>
</template>

<style scoped lang="scss">
.header {
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  padding: 15px 0;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo {
  font-size: 24px;
  color: #409eff;
}

.nav {
  display: flex;
  gap: 30px;

  a {
    font-size: 16px;
    transition: color 0.3s;

    &:hover {
      color: #409eff;
    }
  }
}

.user-actions {
  display: flex;
  gap: 20px;
  align-items: center;
}

.main {
  padding: 40px 0;
}

.hero {
  text-align: center;
  padding: 60px 0;

  h2 {
    font-size: 36px;
    margin-bottom: 15px;
  }

  p {
    font-size: 18px;
    color: #666;
  }
}

.categories {
  h3 {
    margin-bottom: 20px;
  }
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 20px;
}

.category-item {
  background: #fff;
  padding: 30px;
  text-align: center;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.3s, box-shadow 0.3s;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
}
</style>