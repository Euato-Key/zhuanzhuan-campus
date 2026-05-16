<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { createAddress, updateAddress, type Address, type CreateAddressData } from '@/api/address'
import { getProvinces, getCities, getDistricts, type RegionItem } from '@/api/region'

const props = defineProps<{
  modelValue: boolean
  address: Address | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'success'): void
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const isEdit = computed(() => !!props.address)
const dialogTitle = computed(() => (isEdit.value ? '编辑收货地址' : '新增收货地址'))

const formRef = ref<FormInstance>()
const submitting = ref(false)

// 表单数据
const formData = ref<CreateAddressData>({
  receiverName: '',
  receiverPhone: '',
  province: '',
  city: '',
  district: '',
  street: '',
  detail: '',
  isDefault: false,
})

// 地区数据
const provinces = ref<RegionItem[]>([])
const cities = ref<RegionItem[]>([])
const districts = ref<RegionItem[]>([])
const streets = ref<RegionItem[]>([])

// 加载状态
const loadingProvinces = ref(false)
const loadingCities = ref(false)
const loadingDistricts = ref(false)
const loadingStreets = ref(false)

// adcode缓存（用对象比Map更稳定）
const adcodeCache = ref<Record<string, string>>({})

// 表单验证规则
const rules: FormRules = {
  receiverName: [
    { required: true, message: '请输入收货人姓名', trigger: 'blur' },
    { min: 2, max: 20, message: '姓名长度为2-20个字符', trigger: 'blur' },
  ],
  receiverPhone: [
    { required: true, message: '请输入手机号码', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码', trigger: 'blur' },
  ],
  province: [{ required: true, message: '请选择省份', trigger: 'change' }],
  city: [{ required: true, message: '请选择城市', trigger: 'change' }],
  district: [{ required: true, message: '请选择区县', trigger: 'change' }],
  street: [
    { max: 50, message: '街道名称不能超过50个字符', trigger: 'blur' },
  ],
  detail: [
    { required: true, message: '请输入详细地址', trigger: 'blur' },
    { min: 5, max: 100, message: '详细地址长度为5-100个字符', trigger: 'blur' },
  ],
}

// 获取省份
async function loadProvinces() {
  if (provinces.value.length > 0) return
  loadingProvinces.value = true
  try {
    const res = await getProvinces()
    if (res.data.code === 200) {
      provinces.value = res.data.data
      res.data.data.forEach((p) => {
        adcodeCache.value[p.name] = p.adcode
      })
    }
  } catch (err) {
    ElMessage.error('获取省份列表失败')
  } finally {
    loadingProvinces.value = false
  }
}

// 获取城市
async function loadCities(provinceName: string) {
  const adcode = adcodeCache.value[provinceName]
  if (!adcode) return

  loadingCities.value = true
  cities.value = []
  districts.value = []
  streets.value = []

  try {
    const res = await getCities(adcode)
    if (res.data.code === 200) {
      cities.value = res.data.data
      res.data.data.forEach((c) => {
        adcodeCache.value[c.name] = c.adcode
      })
    }
  } catch (err) {
    ElMessage.error('获取城市列表失败')
  } finally {
    loadingCities.value = false
  }
}

// 获取区县
async function loadDistricts(cityName: string) {
  const adcode = adcodeCache.value[cityName]
  if (!adcode) return

  loadingDistricts.value = true
  districts.value = []
  streets.value = []

  try {
    const res = await getDistricts(adcode)
    if (res.data.code === 200) {
      districts.value = res.data.data
      res.data.data.forEach((d) => {
        adcodeCache.value[d.name] = d.adcode
      })
    }
  } catch (err) {
    ElMessage.error('获取区县列表失败')
  } finally {
    loadingDistricts.value = false
  }
}

// 获取街道
async function loadStreets(districtName: string) {
  const adcode = adcodeCache.value[districtName]
  if (!adcode) return

  loadingStreets.value = true
  streets.value = []

  try {
    const res = await getDistricts(adcode)
    if (res.data.code === 200) {
      streets.value = res.data.data
      res.data.data.forEach((s) => {
        adcodeCache.value[s.name] = s.adcode
      })
    }
  } catch (err) {
    // 街道加载失败不提示，因为有些区县没有下级
  } finally {
    loadingStreets.value = false
  }
}

// 省份变化
async function onProvinceChange(val: string) {
  formData.value.city = ''
  formData.value.district = ''
  formData.value.street = ''
  if (val) {
    await loadCities(val)
  }
}

// 城市变化
async function onCityChange(val: string) {
  formData.value.district = ''
  formData.value.street = ''
  if (val) {
    await loadDistricts(val)
  }
}

// 区县变化
async function onDistrictChange(val: string) {
  formData.value.street = ''
  if (val) {
    await loadStreets(val)
  }
}

// 初始化编辑数据
async function initEditData(addr: Address) {
  formData.value = {
    receiverName: addr.receiverName,
    receiverPhone: addr.receiverPhone,
    province: addr.province,
    city: addr.city,
    district: addr.district,
    street: addr.street || '',
    detail: addr.detail,
    isDefault: addr.isDefault,
  }

  // 按顺序加载地区数据
  if (addr.province) {
    await loadCities(addr.province)
    if (addr.city) {
      await loadDistricts(addr.city)
      if (addr.district && addr.street) {
        await loadStreets(addr.district)
      }
    }
  }
}

// 重置表单
function resetForm() {
  formData.value = {
    receiverName: '',
    receiverPhone: '',
    province: '',
    city: '',
    district: '',
    street: '',
    detail: '',
    isDefault: false,
  }
  cities.value = []
  districts.value = []
  streets.value = []
  formRef.value?.resetFields()
}

// 提交表单
async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    const data = { ...formData.value }
    // 清空空的街道
    if (!data.street) delete data.street

    if (isEdit.value && props.address) {
      const res = await updateAddress(props.address.id, data)
      if (res.data.code === 200) {
        ElMessage.success('地址更新成功')
        emit('success')
        handleClose()
      }
    } else {
      const res = await createAddress(data)
      if (res.data.code === 200) {
        ElMessage.success('地址添加成功')
        emit('success')
        handleClose()
      }
    }
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || '保存失败，请重试')
  } finally {
    submitting.value = false
  }
}

// 关闭弹窗
function handleClose() {
  visible.value = false
}

// 监听弹窗打开
watch(visible, async (val) => {
  if (val) {
    await loadProvinces()
    if (props.address) {
      await initEditData(props.address)
    } else {
      resetForm()
    }
  }
})
</script>

<template>
  <el-dialog
    v-model="visible"
    :title="dialogTitle"
    width="520px"
    :close-on-click-modal="false"
    destroy-on-close
    @close="resetForm"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      label-width="80px"
      label-position="left"
      class="address-form"
    >
      <!-- 收货人信息 -->
      <div class="form-section">
        <el-form-item label="收货人" prop="receiverName">
          <el-input
            v-model="formData.receiverName"
            placeholder="姓名"
            maxlength="20"
          />
        </el-form-item>
        <el-form-item label="手机号" prop="receiverPhone">
          <el-input
            v-model="formData.receiverPhone"
            placeholder="11位手机号"
            maxlength="11"
          />
        </el-form-item>
      </div>

      <!-- 地区选择 -->
      <div class="form-section">
        <el-form-item label="所在地区" required class="region-form-item">
          <div class="region-selects">
            <el-select
              v-model="formData.province"
              placeholder="省/直辖市"
              :loading="loadingProvinces"
              filterable
              @change="onProvinceChange"
            >
              <el-option
                v-for="item in provinces"
                :key="item.adcode"
                :label="item.name"
                :value="item.name"
              />
            </el-select>
            <el-select
              v-model="formData.city"
              placeholder="城市"
              :disabled="!formData.province"
              :loading="loadingCities"
              filterable
              @change="onCityChange"
            >
              <el-option
                v-for="item in cities"
                :key="item.adcode"
                :label="item.name"
                :value="item.name"
              />
            </el-select>
            <el-select
              v-model="formData.district"
              placeholder="区县"
              :disabled="!formData.city"
              :loading="loadingDistricts"
              filterable
              @change="onDistrictChange"
            >
              <el-option
                v-for="item in districts"
                :key="item.adcode"
                :label="item.name"
                :value="item.name"
              />
            </el-select>
            <el-select
              v-model="formData.street"
              placeholder="街道/镇(选填)"
              :disabled="!formData.district"
              :loading="loadingStreets"
              filterable
              clearable
            >
              <el-option
                v-for="item in streets"
                :key="item.adcode"
                :label="item.name"
                :value="item.name"
              />
            </el-select>
          </div>
        </el-form-item>
      </div>

      <!-- 详细地址 -->
      <div class="form-section">
        <el-form-item label="详细地址" prop="detail">
          <el-input
            v-model="formData.detail"
            type="textarea"
            :rows="2"
            placeholder="楼栋、门牌号等"
            maxlength="100"
            show-word-limit
          />
        </el-form-item>
      </div>

      <!-- 设为默认 -->
      <el-form-item label=" ">
        <el-checkbox v-model="formData.isDefault">设为默认收货地址</el-checkbox>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">
        保存
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.address-form {
  .form-section {
    margin-bottom: $spacing-md;
    padding-bottom: $spacing-md;
    border-bottom: 1px solid $color-border-light;

    &:last-of-type {
      border-bottom: none;
      margin-bottom: 0;
      padding-bottom: 0;
    }
  }
}

.region-form-item {
  :deep(.el-form-item__content) {
    display: block;
  }
}

.region-selects {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: $spacing-sm;

  .el-select {
    width: 100%;
  }
}

:deep(.el-dialog__body) {
  padding: $spacing-lg $spacing-xl $spacing-sm;
}

:deep(.el-form-item) {
  margin-bottom: $spacing-md;
}

:deep(.el-form-item__label) {
  font-weight: $font-weight-medium;
}

@media (max-width: $breakpoint-sm) {
  .region-selects {
    grid-template-columns: 1fr;
  }
}
</style>