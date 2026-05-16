<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Plus, Edit, StarFilled } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getAddresses,
  deleteAddress,
  setDefaultAddress,
  type Address,
} from '@/api/address'
import AppLayout from '@/components/layout/AppLayout.vue'
import AddressFormDialog from '@/components/address/AddressFormDialog.vue'

const router = useRouter()

const loading = ref(false)
const addresses = ref<Address[]>([])
const formDialogVisible = ref(false)
const editingAddress = ref<Address | null>(null)

const defaultAddress = computed(() => addresses.value.find((a) => a.isDefault))
const otherAddresses = computed(() => addresses.value.filter((a) => !a.isDefault))

function formatAddress(addr: Address): string {
  const parts = [addr.province, addr.city, addr.district]
  if (addr.street) parts.push(addr.street)
  return parts.join('') + ' ' + addr.detail
}

function formatPhone(phone: string): string {
  if (phone.length === 11) {
    return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
  }
  return phone
}

async function fetchAddresses() {
  loading.value = true
  try {
    const res = await getAddresses()
    if (res.data.code === 200) {
      addresses.value = res.data.data
    }
  } catch (err) {
    console.error('获取地址列表失败', err)
    ElMessage.error('获取地址列表失败')
  } finally {
    loading.value = false
  }
}

function handleAdd() {
  editingAddress.value = null
  formDialogVisible.value = true
}

function handleEdit(address: Address) {
  editingAddress.value = address
  formDialogVisible.value = true
}

async function handleDelete(address: Address, event?: Event) {
  event?.stopPropagation()
  if (address.isDefault && addresses.value.length > 1) {
    ElMessage.warning('请先设置其他地址为默认地址')
    return
  }
  try {
    await ElMessageBox.confirm('确定要删除该地址吗？', '提示', { type: 'warning' })
    const res = await deleteAddress(address.id)
    if (res.data.code === 200) {
      ElMessage.success('删除成功')
      fetchAddresses()
    }
  } catch (err: any) {
    if (err !== 'cancel') {
      ElMessage.error(err.response?.data?.message || '删除失败')
    }
  }
}

async function handleSetDefault(address: Address, event?: Event) {
  event?.stopPropagation()
  if (address.isDefault) return
  try {
    const res = await setDefaultAddress(address.id)
    if (res.data.code === 200) {
      ElMessage.success('已设为默认地址')
      fetchAddresses()
    }
  } catch (err) {
    console.error('设置默认地址失败', err)
    ElMessage.error('设置失败')
  }
}

function handleFormSuccess() {
  formDialogVisible.value = false
  fetchAddresses()
}

function goBack() {
  router.back()
}

onMounted(() => {
  fetchAddresses()
})
</script>

<template>
  <AppLayout>
    <div class="addresses-page">
      <!-- 页面头部 -->
      <div class="page-header">
        <el-button link class="back-btn" @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
          返回
        </el-button>
        <div class="header-center">
          <h1 class="page-title">收货地址</h1>
          <span class="address-count">{{ addresses.length }}/20</span>
        </div>
        <el-button type="primary" :icon="Plus" @click="handleAdd" :disabled="addresses.length >= 20">
          新增地址
        </el-button>
      </div>

      <!-- 地址列表 -->
      <div class="address-list" v-loading="loading">
        <!-- 空状态 -->
        <div v-if="addresses.length === 0 && !loading" class="empty-state">
          <el-empty description="暂无收货地址">
            <el-button type="primary" :icon="Plus" @click="handleAdd">添加地址</el-button>
          </el-empty>
        </div>

        <!-- 默认地址 -->
        <div v-if="defaultAddress" class="address-card default-card" @click="handleEdit(defaultAddress)">
          <div class="card-body">
            <div class="receiver-row">
              <span class="receiver-name">{{ defaultAddress.receiverName }}</span>
              <span class="receiver-phone">{{ defaultAddress.receiverPhone }}</span>
              <el-tag type="success" size="small" effect="plain" class="default-badge">
                <el-icon><StarFilled /></el-icon> 默认
              </el-tag>
            </div>
            <div class="address-full">{{ formatAddress(defaultAddress) }}</div>
          </div>
          <div class="card-actions">
            <el-button type="primary" text size="small" @click.stop="handleEdit(defaultAddress)">
              <el-icon><Edit /></el-icon> 编辑
            </el-button>
            <el-button type="danger" text size="small" @click.stop="handleDelete(defaultAddress)">
              删除
            </el-button>
          </div>
        </div>

        <!-- 其他地址 -->
        <template v-if="otherAddresses.length > 0">
          <div v-if="defaultAddress" class="list-divider">其他地址</div>
          <div
            v-for="address in otherAddresses"
            :key="address.id"
            class="address-card"
            @click="handleEdit(address)"
          >
            <div class="card-body">
              <div class="receiver-row">
                <span class="receiver-name">{{ address.receiverName }}</span>
                <span class="receiver-phone">{{ formatPhone(address.receiverPhone) }}</span>
              </div>
              <div class="address-full">{{ formatAddress(address) }}</div>
            </div>
            <div class="card-actions">
              <el-button type="primary" text size="small" @click.stop="handleSetDefault(address)">
                设为默认
              </el-button>
              <el-button type="primary" text size="small" @click.stop="handleEdit(address)">
                编辑
              </el-button>
              <el-button type="danger" text size="small" @click.stop="handleDelete(address)">
                删除
              </el-button>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- 地址表单弹窗 -->
    <AddressFormDialog
      v-model="formDialogVisible"
      :address="editingAddress"
      @success="handleFormSuccess"
    />
  </AppLayout>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.addresses-page {
  max-width: $container-md;
  margin: 0 auto;
  padding: $spacing-lg;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: $spacing-xl;
  background: $color-bg-card;
  border-radius: $radius-lg;
  padding: $spacing-md $spacing-lg;
  box-shadow: $shadow-sm;

  .header-center {
    display: flex;
    align-items: baseline;
    gap: $spacing-sm;
  }

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

  .page-title {
    font-size: $font-size-h2;
    font-weight: $font-weight-semibold;
    color: $color-text-primary;
    margin: 0;
  }

  .address-count {
    font-size: $font-size-small;
    color: $color-text-placeholder;
  }
}

.address-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
}

.empty-state {
  padding: $spacing-xxl 0;
}

.list-divider {
  font-size: $font-size-small;
  color: $color-text-placeholder;
  padding: $spacing-sm 0;
  border-bottom: 1px dashed $color-border-light;
  margin-top: $spacing-sm;
}

.address-card {
  background: $color-bg-card;
  border-radius: $radius-lg;
  padding: $spacing-md $spacing-lg;
  border: 1px solid $color-border;
  cursor: pointer;
  transition: all $transition-fast;

  &:hover {
    border-color: $color-primary;
    box-shadow: $shadow-sm;
  }

  &.default-card {
    border-color: $color-primary;
    background: linear-gradient(135deg, rgba($color-primary, 0.03) 0%, rgba($color-primary, 0.08) 100%);
  }
}

.card-body {
  .receiver-row {
    display: flex;
    align-items: center;
    gap: $spacing-md;
    margin-bottom: $spacing-xs;
  }

  .receiver-name {
    font-size: $font-size-body;
    font-weight: $font-weight-semibold;
    color: $color-text-primary;
  }

  .receiver-phone {
    font-size: $font-size-small;
    color: $color-text-secondary;
    font-family: $font-family-mono;
  }

  .default-badge {
    .el-icon {
      font-size: 10px;
      margin-right: 2px;
    }
  }

  .address-full {
    font-size: $font-size-small;
    color: $color-text-primary;
    line-height: $line-height-relaxed;
    word-break: break-all;
  }
}

.card-actions {
  display: flex;
  justify-content: flex-end;
  gap: $spacing-xs;
  margin-top: $spacing-sm;
  padding-top: $spacing-sm;
  border-top: 1px solid $color-border-light;
}

@media (max-width: $breakpoint-sm) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: $spacing-md;

    .el-button--primary {
      width: 100%;
    }
  }
}
</style>