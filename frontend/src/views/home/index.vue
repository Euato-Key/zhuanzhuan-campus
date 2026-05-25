<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import AppLayout from '@/components/layout/AppLayout.vue'
import ProductCard from '@/components/product/ProductCard.vue'
import WantBuyCard from '@/components/want-buy/WantBuyCard.vue'
import { useUserStore } from '@/stores/user'
import { useAuthDialog } from '@/composables/useAuthDialog'
import { getProductList, type ProductListItem } from '@/api/modules/product'
import { getWantBuyList, type WantBuyListItem } from '@/api/modules/want-buy'
import { getActiveBanners, type BannerItem } from '@/api/modules/banner'
import { getOssUrl } from '@/utils/oss'
import { showError } from '@/utils/error'

const router = useRouter()
const userStore = useUserStore()
const authDialog = useAuthDialog()

const banners = ref<BannerItem[]>([])
const hotProducts = ref<ProductListItem[]>([])
const hotWantBuys = ref<WantBuyListItem[]>([])
const loading = ref(false)

function handleBannerClick(banner: BannerItem) {
  if (!banner.linkUrl) return
  if (banner.linkUrl.startsWith('/')) {
    router.push(banner.linkUrl)
  } else {
    window.open(banner.linkUrl, '_blank')
  }
}

async function fetchData() {
  loading.value = true
  try {
    const [bannerRes, prodRes, wantBuyRes] = await Promise.all([
      getActiveBanners(),
      getProductList({ sortBy: 'favorite', sortOrder: 'desc', pageSize: 8 }),
      getWantBuyList({ sortBy: 'view', sortOrder: 'desc', pageSize: 4, status: 'active' }),
    ])

    if (bannerRes.data.code === 200) {
      banners.value = bannerRes.data.data
    }
    if (prodRes.data.code === 200) {
      hotProducts.value = prodRes.data.data.list
    }
    if (wantBuyRes.data.code === 200) {
      hotWantBuys.value = wantBuyRes.data.data.list
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
    <!-- Banner 轮播图 -->
    <section v-if="banners.length > 0" class="banner-section">
      <el-carousel height="360px" :interval="4000" arrow="hover" indicator-position="outside">
        <el-carousel-item v-for="banner in banners" :key="banner.id">
          <div
            class="banner-item"
            :class="{ clickable: banner.linkUrl }"
            @click="handleBannerClick(banner)"
          >
            <img :src="getOssUrl(banner.imageUrl)" :alt="banner.title" class="banner-image" />
            <div v-if="banner.title" class="banner-overlay">
              <h2 class="banner-title">{{ banner.title }}</h2>
            </div>
          </div>
        </el-carousel-item>
      </el-carousel>
    </section>

    <!-- 无 Banner 时的简版 Hero -->
    <section v-else class="hero">
      <div class="hero-content">
        <h1 class="hero-title">校园二手交易平台</h1>
        <p class="hero-desc">买卖二手商品，就来转转校园 · 闲置物品再利用，环保又省钱</p>
        <div class="hero-actions">
          <RouterLink to="/products" class="btn btn-primary">浏览商品</RouterLink>
          <a v-if="userStore.isLoggedIn" class="btn btn-secondary" @click="router.push('/products')">发布商品</a>
          <a v-else class="btn btn-secondary" @click="authDialog.open('login')">发布商品</a>
          <RouterLink to="/want-buy" class="btn btn-outline">求购社区</RouterLink>
        </div>
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

    <section class="hot-want-buys">
      <div class="section-header">
        <h3 class="section-title">热门求购</h3>
        <RouterLink to="/want-buy" class="more-link">查看更多 →</RouterLink>
      </div>
      <div class="want-buy-grid" v-loading="loading">
        <WantBuyCard
          v-for="item in hotWantBuys"
          :key="item.id"
          :want-buy="item"
          @click="(id: number) => router.push({ name: 'WantBuyDetail', params: { id } })"
        />
        <el-empty v-if="!loading && hotWantBuys.length === 0" description="暂无求购信息" />
      </div>
    </section>
  </AppLayout>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

// ─── Banner ───
.banner-section {
  margin-bottom: 40px;
  border-radius: 16px;
  overflow: hidden;
}

.banner-item {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;

  &.clickable { cursor: pointer; }
}

.banner-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.banner-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20px 32px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.5));
}

.banner-title {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  color: #fff;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}

// ─── Hero (fallback) ───
.hero {
  background: linear-gradient(135deg, $color-primary-pale 0%, #fff 100%);
  border-radius: 16px;
  padding: 60px 40px;
  margin-bottom: 40px;
}

.hero-content { max-width: 600px; }

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

  &-outline {
    background: transparent;
    color: $color-primary;
    border: 1px solid $color-primary;
    &:hover { background: $color-primary-pale; }
  }
}

// ─── Hot products ───
.section-title {
  font-size: 20px;
  font-weight: 600;
  color: $color-text-primary;
  margin-bottom: 20px;
}

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

// ─── Hot want-buys ───
.hot-want-buys {
  margin-bottom: 40px;

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

.want-buy-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;

  @media (max-width: 992px) { grid-template-columns: repeat(3, 1fr); }
  @media (max-width: 768px) { grid-template-columns: repeat(2, 1fr); }
}
</style>
