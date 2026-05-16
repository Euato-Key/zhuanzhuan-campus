<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Star, Delete, Search } from '@element-plus/icons-vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import {
  getMyFavorites,
  removeFavorite,
  type FavoriteItem,
  PRODUCT_STATUS_LABELS,
  PRODUCT_STATUS_TAG_TYPE,
  type ProductStatus,
} from '@/api/product'
import { getOssUrl } from '@/utils/oss'
import { showError, showSuccess } from '@/utils/error'

const router = useRouter()

const loading = ref(false)
const favorites = ref<FavoriteItem[]>([])
const total = ref(0)

const queryParams = reactive({
  page: 1,
  pageSize: 10,
})

async function fetchFavorites() {
  loading.value = true
  try {
    const res = await getMyFavorites(queryParams)
    if (res.data.code === 200) {
      favorites.value = res.data.data.list
      total.value = res.data.data.total
    }
  } catch (err) {
    showError(err, '获取收藏列表失败')
  } finally {
    loading.value = false
  }
}

function handlePageChange(page: number) {
  queryParams.page = page
  fetchFavorites()
}

function viewProduct(product: FavoriteItem) {
  router.push({ name: 'ProductDetail', params: { id: product.id } })
}

async function unfavorite(product: FavoriteItem) {
  try {
    await ElMessageBox.confirm('确定要取消收藏该商品吗？', '提示', { type: 'warning' })
    const res = await removeFavorite(product.id)
    if (res.data.code === 200) {
      showSuccess('已取消收藏')
      fetchFavorites()
    }
  } catch (err) {
    if (err !== 'cancel') showError(err, '操作失败')
  }
}

onMounted(() => {
  fetchFavorites()
})
</script>

<template>
  <AppLayout>
    <div class="favorites-page">
      <!-- 页头 -->
      <div class="page-header">
        <div class="header-left">
          <div class="header-icon">
            <el-icon :size="28"><Star /></el-icon>
          </div>
          <div class="header-text">
            <h2>我的收藏</h2>
            <p>收藏的商品，随时查看与取消</p>
          </div>
        </div>
      </div>

      <!-- 收藏列表 -->
      <div v-loading="loading" class="favorite-list">
        <template v-if="favorites.length">
          <div v-for="product in favorites" :key="product.id" class="favorite-card">
            <!-- 商品图片 -->
            <div class="card-image" @click="viewProduct(product)">
              <img :src="getOssUrl(product.images?.[0])" :alt="product.name" />
              <el-tag
                v-if="product.status !== 'active'"
                :type="PRODUCT_STATUS_TAG_TYPE[product.status as ProductStatus]"
                size="small"
                class="status-overlay"
              >
                {{ PRODUCT_STATUS_LABELS[product.status as ProductStatus] }}
              </el-tag>
            </div>

            <!-- 商品信息 -->
            <div class="card-body" @click="viewProduct(product)">
              <h3 class="card-title">{{ product.name }}</h3>
              <div class="card-meta">
                <span class="card-price">¥{{ product.currentPrice }}</span>
                <span v-if="product.originalPrice" class="card-original-price">¥{{ product.originalPrice }}</span>
                <el-tag v-if="product.bargain" type="warning" size="small">可议价</el-tag>
              </div>
              <div class="card-info">
                <span>{{ product.category?.name }}</span>
                <span>{{ product.user?.username }}</span>
              </div>
              <div class="card-time">收藏于 {{ new Date(product.favoritedAt).toLocaleDateString() }}</div>
            </div>

            <!-- 操作按钮 -->
            <div class="card-actions">
              <el-button
                type="danger"
                plain
                size="small"
                :icon="Delete"
                @click.stop="unfavorite(product)"
              >
                取消收藏
              </el-button>
            </div>
          </div>
        </template>

        <!-- 空状态 -->
        <el-empty v-else description="暂无收藏">
          <el-button type="primary" @click="router.push('/products')">去逛逛</el-button>
        </el-empty>
      </div>

      <!-- 分页 -->
      <div v-if="total > queryParams.pageSize" class="pagination-wrap">
        <el-pagination
          background
          layout="total, prev, pager, next"
          :total="total"
          :page-size="queryParams.pageSize"
          :current-page="queryParams.page"
          @current-change="handlePageChange"
        />
      </div>
    </div>
  </AppLayout>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.favorites-page {
  max-width: 960px;
  margin: 0 auto;
  padding: 24px 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 24px 28px;
  background: linear-gradient(135deg, rgba($color-primary, 0.08), rgba($color-primary, 0.02));
  border-radius: $radius-lg;
  border: 1px solid rgba($color-primary, 0.12);

  .header-left {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .header-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 52px;
    height: 52px;
    border-radius: $radius-md;
    background: $color-primary;
    color: #fff;
    flex-shrink: 0;
  }

  .header-text {
    h2 {
      margin: 0 0 2px;
      font-size: 20px;
      font-weight: 600;
      color: $color-text-primary;
    }

    p {
      margin: 0;
      font-size: 13px;
      color: $color-text-secondary;
    }
  }
}

.favorite-list {
  min-height: 200px;
}

.favorite-card {
  display: flex;
  gap: 16px;
  padding: 16px;
  background: #fff;
  border-radius: $radius-lg;
  border: 1px solid $color-border;
  margin-bottom: 12px;
  transition: box-shadow 0.2s;

  &:hover {
    box-shadow: $shadow-md;
  }
}

.card-image {
  width: 120px;
  height: 120px;
  border-radius: $radius-md;
  overflow: hidden;
  flex-shrink: 0;
  cursor: pointer;
  position: relative;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .status-overlay {
    position: absolute;
    top: 6px;
    left: 6px;
  }
}

.card-body {
  flex: 1;
  min-width: 0;
  cursor: pointer;
}

.card-title {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 500;
  color: $color-text-primary;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 6px;
}

.card-price {
  font-size: 18px;
  font-weight: 600;
  color: $color-error;
}

.card-original-price {
  font-size: 13px;
  color: $color-text-placeholder;
  text-decoration: line-through;
}

.card-info {
  display: flex;
  gap: 12px;
  font-size: 13px;
  color: $color-text-secondary;
  margin-bottom: 4px;
}

.card-time {
  font-size: 12px;
  color: $color-text-placeholder;
}

.card-actions {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
  flex-shrink: 0;
}

.pagination-wrap {
  display: flex;
  justify-content: center;
  margin-top: 24px;
}
</style>