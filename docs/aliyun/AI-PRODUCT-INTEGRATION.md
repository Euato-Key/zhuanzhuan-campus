# AI 智能发布商品 — 前端集成指南

> 本文档描述前端如何接入 AI 智能发布商品功能，包括图片上传、AI 分析、预览编辑、确认发布的完整流程。

---

## 目录

1. [整体流程](#1-整体流程)
2. [图片上传方案](#2-图片上传方案)
3. [Step 1: 上传图片到 OSS](#step-1-上传图片到-oss)
4. [Step 2: 调用 AI 分析接口](#step-2-调用-ai-分析接口)
5. [Step 3: 预览与编辑](#step-3-预览与编辑)
6. [Step 4: 确认发布](#step-4-确认发布)
7. [错误处理](#7-错误处理)
8. [完整代码示例](#8-完整代码示例)

---

## 1. 整体流程

```
用户选择图片
    ↓
前端直传 OSS（获取公网 URL）
    ↓
调用 POST /api/ai-products/analyze（传图片 URL + 补充信息）
    ↓
后端调用 Kimi AI 分析图片
    ↓
返回结构化商品数据
    ↓
前端展示预览表单（所有字段可编辑）
    ↓
用户确认/修改后
    ↓
调用 POST /api/ai-products/publish（提交最终数据）
    ↓
商品创建成功，进入审核状态
```

---

## 2. 图片上传方案

**方案：前端直传 OSS**

原因：
- 减少后端带宽压力（图片不经过后端服务器）
- 上传速度快（用户直连阿里云 OSS）
- 安全（使用 STS 临时凭证，无需暴露永久密钥）
- AI 分析需要公网可访问的图片 URL

**不支持 Base64**：AI 多模态接口接收图片 URL，Base64 编码会导致请求体过大。

---

## Step 1: 上传图片到 OSS

### 1.1 获取 STS 临时凭证

```javascript
// 获取 STS 凭证（用于前端直传 OSS）
const getSTSToken = async () => {
  const res = await fetch('/api/upload/sts-token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ type: 'product' })
  });
  return res.json();
};
```

### 1.2 使用 OSS SDK 上传图片

> **重要：** AI 发布必须使用 `tempPath` 上传到临时目录，不要使用 `uploadPath`。`tempPath` 格式为 `products/{userId}/temp/`，前端直接拼接文件名即可。

```javascript
import OSS from 'ali-oss';

const uploadImages = async (files) => {
  // 1. 获取 STS 凭证
  const { data: sts } = await getSTSToken();

  // 2. 初始化 OSS 客户端
  const client = new OSS({
    region: sts.region,
    accessKeyId: sts.accessKeyId,
    accessKeySecret: sts.accessKeySecret,
    stsToken: sts.securityToken,
    bucket: sts.bucket,
  });

  // 3. 上传所有图片
  const uploadPromises = files.map(async (file) => {
    const path = `${sts.tempPath}${Date.now()}_${Math.random().toString(36).slice(2)}.${file.name.split('.').pop()}`;
    const result = await client.put(path, file);
    return result.url; // 返回公网可访问的 URL
  });

  const imageUrls = await Promise.all(uploadPromises);
  return imageUrls;
};
```

---

## Step 2: 调用 AI 分析接口

### 请求

```javascript
const analyzeProduct = async (imageUrls, userInput = {}) => {
  const res = await fetch('/api/ai-products/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      imageUrls,           // 必填：图片 URL 数组（1-5张）
      name: userInput.name,       // 选填：商品名称
      model: userInput.model,     // 选填：具体型号
      description: userInput.desc // 选填：补充描述
    })
  });
  return res.json();
};
```

### 响应示例

```json
{
  "success": true,
  "message": "AI 分析成功",
  "data": {
    "categoryId": 3,
    "categoryName": "数码电子",
    "brand": "Apple",
    "model": "iPhone 15 Pro 256GB",
    "condition": 3,
    "conditionText": "95新",
    "conditionDesc": "屏幕完好，边框有轻微使用痕迹",
    "estimatedPriceLow": 4800,
    "estimatedPriceHigh": 5500,
    "estimatedPriceRecommended": 5200,
    "title": "iPhone 15 Pro 256GB 原色钛金属 95新",
    "description": "2024年3月购入，使用约一年，电池健康度92%，配件齐全...",
    "suggestions": [
      "建议附上电池健康度截图增加可信度",
      "同类商品均价约5300，建议定价5200左右"
    ],
    "tags": ["苹果", "手机", "95新"]
  }
}
```

### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `categoryId` | number \| null | 匹配到的分类 ID，未匹配时为 null |
| `categoryName` | string | 分类名称 |
| `brand` | string | 品牌 |
| `model` | string | 型号 |
| `condition` | number | 成色编码：1-全新, 2-99新, 3-95新, 4-9成新, 5-8成新及以下 |
| `conditionText` | string | 成色文本 |
| `conditionDesc` | string | 成色详细描述 |
| `estimatedPriceLow` | number | 最低预估价 |
| `estimatedPriceHigh` | number | 最高预估价 |
| `estimatedPriceRecommended` | number | 推荐售价 |
| `title` | string | AI 生成的标题 |
| `description` | string | AI 生成的描述 |
| `suggestions` | string[] | 交易建议 |
| `tags` | string[] | 标签 |

---

## Step 3: 预览与编辑

前端展示一个可编辑的预览表单，所有 AI 生成的字段都允许用户修改：

```vue
<template>
  <div class="ai-product-preview">
    <!-- 商品标题 -->
    <div class="form-item">
      <label>商品标题</label>
      <input v-model="form.title" maxlength="40" />
      <span class="hint">{{ form.title.length }}/40</span>
    </div>

    <!-- 商品分类 -->
    <div class="form-item">
      <label>商品分类</label>
      <select v-model="form.categoryId">
        <option v-for="cat in categories" :key="cat.id" :value="cat.id">
          {{ cat.name }}
        </option>
      </select>
      <span v-if="!form.categoryId" class="warning">
        AI 未匹配到分类，请手动选择
      </span>
    </div>

    <!-- 售价 -->
    <div class="form-item">
      <label>售价（元）</label>
      <input v-model.number="form.currentPrice" type="number" />
      <div class="price-hint">
        AI 预估区间：¥{{ aiResult.estimatedPriceLow }} - ¥{{ aiResult.estimatedPriceHigh }}
        <br />
        推荐售价：¥{{ aiResult.estimatedPriceRecommended }}
      </div>
    </div>

    <!-- 成色 -->
    <div class="form-item">
      <label>成色</label>
      <select v-model.number="form.condition">
        <option :value="1">全新</option>
        <option :value="2">99新</option>
        <option :value="3">95新</option>
        <option :value="4">9成新</option>
        <option :value="5">8成新及以下</option>
      </select>
    </div>

    <!-- 商品描述 -->
    <div class="form-item">
      <label>商品描述</label>
      <textarea v-model="form.description" rows="6" maxlength="2000" />
      <span class="hint">{{ form.description.length }}/2000</span>
    </div>

    <!-- 交易方式 -->
    <div class="form-item">
      <label>交易方式</label>
      <select v-model.number="form.tradeMethod">
        <option :value="1">仅自提</option>
        <option :value="2">仅邮寄</option>
        <option :value="3">自提和邮寄均可</option>
      </select>
    </div>

    <!-- AI 建议（只读展示） -->
    <div class="suggestions" v-if="aiResult.suggestions?.length">
      <h4>AI 交易建议</h4>
      <ul>
        <li v-for="(s, i) in aiResult.suggestions" :key="i">{{ s }}</li>
      </ul>
    </div>

    <!-- 操作按钮 -->
    <div class="actions">
      <button @click="reAnalyze">重新分析</button>
      <button @click="publish" class="primary">确认发布</button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';

const props = defineProps({
  aiResult: Object,      // AI 分析结果
  imageUrls: Array,      // 图片 URL
  categories: Array,     // 分类列表
});

// 表单数据（基于 AI 结果，用户可编辑）
const form = reactive({
  title: props.aiResult.title,
  description: props.aiResult.description,
  categoryId: props.aiResult.categoryId,
  currentPrice: props.aiResult.estimatedPriceRecommended,
  condition: props.aiResult.condition,
  tradeMethod: 3,        // 默认均可
  campus: '北京大学本部', // 默认用户校区
  images: props.imageUrls,
  originalPrice: null,
  isFreeShipping: 0,
  priceNegotiable: 1,
});

const emit = defineEmits(['publish', 'reAnalyze']);

const publish = () => {
  emit('publish', { ...form });
};

const reAnalyze = () => {
  emit('reAnalyze');
};
</script>
```

---

## Step 4: 确认发布

### 请求

```javascript
const publishProduct = async (productData) => {
  const res = await fetch('/api/ai-products/publish', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(productData)
  });
  return res.json();
};
```

### 请求参数

与普通商品发布接口字段完全一致：

| 字段 | 必填 | 说明 |
|------|------|------|
| `title` | 是 | 商品标题（5-40字） |
| `description` | 是 | 商品描述（10-2000字） |
| `categoryId` | 是 | 分类 ID |
| `currentPrice` | 是 | 售价（>0） |
| `condition` | 是 | 成色（1-5） |
| `tradeMethod` | 是 | 交易方式（1-3） |
| `campus` | 是 | 校区 |
| `images` | 否 | 图片 URL 数组 |
| `originalPrice` | 否 | 原价 |
| `isFreeShipping` | 否 | 是否包邮（0/1） |
| `priceNegotiable` | 否 | 议价方式（0-2） |

### 响应示例

```json
{
  "success": true,
  "message": "AI 商品发布成功",
  "data": {
    "id": 123,
    "title": "iPhone 15 Pro 256GB 原色钛金属 95新",
    "status": 0,
    "images": [...]
  }
}
```

---

## 7. 错误处理

### 常见错误码

| HTTP 状态码 | 场景 | 前端处理 |
|------------|------|---------|
| 400 | 图片数量超限、URL 格式无效 | 提示用户检查图片 |
| 401 | 未登录或 Token 过期 | 跳转登录页 |
| 422 | 字段校验失败 | 展示具体错误信息 |
| 500 | AI 分析失败 | 提示"AI 分析失败，请重试或手动填写" |

### AI 分析失败降级方案

当 AI 分析接口返回 500 错误时，前端应：
1. 提示用户 "AI 分析暂时不可用"
2. 提供「手动填写」按钮，跳转到普通发布页面
3. 保留用户已上传的图片，减少重复操作

```javascript
const handleAnalyzeError = (error) => {
  if (error.status === 500) {
    showToast('AI 分析暂时不可用，请手动填写商品信息');
    router.push('/product/publish-manual', {
      state: { imageUrls } // 传递已上传的图片
    });
  }
};
```

---

## 8. 完整代码示例

### Vue 3 Composition API 完整示例

```vue
<template>
  <div class="ai-publish-page">
    <!-- 步骤 1: 上传图片 -->
    <div v-if="step === 1" class="upload-section">
      <h2>上传商品图片</h2>
      <input
        type="file"
        multiple
        accept="image/*"
        @change="handleFileSelect"
        :disabled="uploading"
      />
      <div class="preview-list">
        <img v-for="(url, i) in imageUrls" :key="i" :src="url" />
      </div>
      <button @click="startAnalyze" :disabled="!imageUrls.length || uploading">
        {{ uploading ? '上传中...' : 'AI 智能识别' }}
      </button>
    </div>

    <!-- 步骤 2: 预览编辑 -->
    <div v-if="step === 2" class="preview-section">
      <h2>AI 识别结果（可编辑）</h2>
      <!-- 表单内容见 Step 3 -->
      <button @click="handlePublish">确认发布</button>
    </div>

    <!-- 步骤 3: 发布成功 -->
    <div v-if="step === 3" class="success-section">
      <h2>发布成功！</h2>
      <p>商品已进入审核状态</p>
      <button @click="$router.push('/products/' + publishedId)">查看商品</button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import OSS from 'ali-oss';

const router = useRouter();
const step = ref(1);
const uploading = ref(false);
const imageUrls = ref([]);
const aiResult = ref(null);
const publishedId = ref(null);

// 表单数据
const form = reactive({});

// 选择文件
const handleFileSelect = async (e) => {
  const files = Array.from(e.target.files).slice(0, 5);
  if (files.length === 0) return;

  uploading.value = true;
  try {
    imageUrls.value = await uploadToOSS(files);
  } catch (err) {
    alert('上传失败: ' + err.message);
  } finally {
    uploading.value = false;
  }
};

// 上传 OSS
const uploadToOSS = async (files) => {
  const tokenRes = await fetch('/api/upload/sts-token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    body: JSON.stringify({ type: 'product' })
  });
  const { data: sts } = await tokenRes.json();

  const client = new OSS({
    region: sts.region,
    accessKeyId: sts.accessKeyId,
    accessKeySecret: sts.accessKeySecret,
    stsToken: sts.securityToken,
    bucket: sts.bucket,
  });

  const urls = [];
  for (const file of files) {
    const ext = file.name.split('.').pop();
    const path = `${sts.tempPath}${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const result = await client.put(path, file);
    urls.push(result.url);
  }
  return urls;
};

// AI 分析
const startAnalyze = async () => {
  uploading.value = true;
  try {
    const res = await fetch('/api/ai-products/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ imageUrls: imageUrls.value })
    });
    const result = await res.json();

    if (!result.success) {
      throw new Error(result.message);
    }

    aiResult.value = result.data;
    // 初始化表单
    Object.assign(form, {
      title: result.data.title,
      description: result.data.description,
      categoryId: result.data.categoryId,
      currentPrice: result.data.estimatedPriceRecommended,
      condition: result.data.condition,
      tradeMethod: 3,
      campus: '北京大学本部',
      images: imageUrls.value,
      originalPrice: null,
      isFreeShipping: 0,
      priceNegotiable: 1,
    });

    step.value = 2;
  } catch (err) {
    alert('AI 分析失败: ' + err.message);
  } finally {
    uploading.value = false;
  }
};

// 发布商品
const handlePublish = async () => {
  try {
    const res = await fetch('/api/ai-products/publish', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ ...form })
    });
    const result = await res.json();

    if (result.success) {
      publishedId.value = result.data.id;
      step.value = 3;
    } else {
      alert(result.message);
    }
  } catch (err) {
    alert('发布失败: ' + err.message);
  }
};
</script>
```

---

## 9. 图片生命周期管理（重要）

### 问题背景

AI 发布流程中，用户上传图片到 OSS 后可能出现两种情况：
- **用户确认发布**：图片被商品引用，成为正式商品图片
- **用户取消/放弃**：图片留在 OSS 中成为垃圾文件，占用存储空间

### 解决方案：标记 + 定时清理

#### 方案设计

```
用户上传图片到 OSS
    ↓
图片路径包含 "temp" 标记（如 products/temp/2024/01/15/xxx.jpg）
    ↓
用户确认发布 → 后端将图片路径中的 "temp" 替换为 "final"
         ↓
    用户取消/放弃 → 图片保留在 temp 目录
         ↓
    定时任务每天扫描 temp 目录，删除超过 7 天的文件
```

#### 前端实现

上传时指定 `temp` 路径：

```javascript
const uploadToOSS = async (files) => {
  const { data: sts } = await getSTSToken();

  const client = new OSS({
    region: sts.region,
    accessKeyId: sts.accessKeyId,
    accessKeySecret: sts.accessKeySecret,
    stsToken: sts.securityToken,
    bucket: sts.bucket,
  });

  const urls = [];
  for (const file of files) {
    const ext = file.name.split('.').pop();
    // 关键：使用 STS 响应中的 tempPath（按用户隔离）
    // 格式: products/{userId}/temp/
    const path = `${sts.tempPath}${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const result = await client.put(path, file);
    urls.push(result.url);
  }
  return urls;
};
```

#### 后端实现（发布时转正）

```javascript
// 在 aiProduct.controller.js 的 publish 方法中
const fileService = require('../services/file.service');

async publishProduct(req, res, next) {
  try {
    const userId = req.user.id;
    const { images, ...productData } = req.body;

    // 1. 将 temp 图片复制为正式图片
    const finalImages = [];
    for (const tempUrl of images) {
      const finalUrl = await fileService.moveTempToFinal(tempUrl, userId);
      finalImages.push(finalUrl);
    }

    // 2. 使用正式图片 URL 创建商品
    const product = await productService.createProduct(userId, {
      ...productData,
      images: finalImages,
    });

    return ApiResponse.success(res, product, "AI 商品发布成功", 201);
  } catch (error) {
    next(error);
  }
}
```

#### 后端实现（定时清理）

```javascript
// src/scripts/cron/cleanTempImages.js
const OSS = require('ali-oss');
const config = require('../../config');
const logger = require('../../utils/logger');

async function cleanTempImages() {
  const client = new OSS({
    region: config.oss.region,
    accessKeyId: config.oss.accessKeyId,
    accessKeySecret: config.oss.accessKeySecret,
    bucket: config.oss.bucket,
  });

  // 获取 7 天前的时间戳
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // 列出所有用户的 temp 目录下的文件
  // 按用户隔离后的路径: products/{userId}/temp/
  const result = await client.list({
    prefix: 'products/',
    'max-keys': 1000,
  });

  // 筛选出 temp 目录下的文件
  const tempFiles = result.objects.filter(obj => obj.name.includes('/temp/'));

  const filesToDelete = tempFiles.filter(obj => {
    return new Date(obj.lastModified) < sevenDaysAgo;
  });

  if (filesToDelete.length > 0) {
    await client.deleteMulti(filesToDelete.map(f => f.name));
    logger.info(`清理临时图片: ${filesToDelete.length} 个`);
  }
}

// 每天凌晨 3 点执行
const schedule = require('node-schedule');
schedule.scheduleJob('0 3 * * *', cleanTempImages);
```

### 替代方案对比

| 方案 | 优点 | 缺点 | 适用场景 |
|------|------|------|---------|
| **标记 + 定时清理**（推荐） | 实现简单，不影响用户体验 | 临时文件会占用 7 天存储 | 大多数场景 |
| 前端直接删除 | 立即释放空间 | 需要前端处理，用户可能绕过 | 简单应用 |
| 后端发布后立即删除 temp | 逻辑清晰 | 需要额外的复制操作 | 对存储敏感 |
| 使用预签名 URL（不存 OSS） | 零垃圾文件 | AI 无法访问预签名 URL | 不适用 |

### 建议

**采用「标记 + 定时清理」方案**，原因：
1. AI 分析需要公网可访问的 URL，预签名 URL 不适用
2. 用户可能多次重新分析，保留 temp 图片避免重复上传
3. 7 天清理周期平衡了存储成本和用户体验
4. 实现简单，前后端改动最小

---

## 注意事项

1. **图片必须先上传 OSS**：AI 分析接口只接收公网 URL，不支持 Base64 或文件流
2. **分类可能未匹配**：当 `categoryId` 为 null 时，前端必须要求用户手动选择分类
3. **价格仅供参考**：AI 预估价格基于图片分析，用户应根据实际情况调整
4. **所有字段可编辑**：AI 生成的内容不一定 100% 准确，必须允许用户修改
5. **Token 有效期**：注意处理 401 错误，Token 过期时引导用户重新登录
6. **临时图片清理**：确保后端配置了定时清理任务，避免 OSS 存储无限增长
