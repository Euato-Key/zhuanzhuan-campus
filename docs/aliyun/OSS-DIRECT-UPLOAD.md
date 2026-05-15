# 阿里云OSS前端直传技术文档

## 目录

1. [方案概述](#方案概述)
2. [方案选型说明](#方案选型说明)
3. [后端服务接口](#后端服务接口)
4. [前端集成指南](#前端集成指南)
5. [安全注意事项](#安全注意事项)
6. [环境变量配置](#环境变量配置)
7. [最佳实践](#最佳实践)
8. [故障排查](#故障排查)

---

## 方案概述

本文档描述了转转校园二手交易平台中文件上传采用**前端直传**模式的实现方案。

### 为什么采用前端直传？

**传统后端代理模式的问题：**
- 文件流量全部经过后端服务器，增加带宽成本
- 大文件上传占用服务器资源，影响其他业务
- 上传链路长，用户体验不佳
- 服务器成为单点瓶颈

**前端直传的优势：**
- 文件直接从浏览器上传到OSS，减轻服务器压力
- 上传速度更快，用户体验更好
- 支持大文件分片上传
- 更好的可扩展性

---

## 方案选型说明

### 方案对比

| 特性 | STS临时授权 | 签名URL |
|------|-------------|---------|
| 实现复杂度 | 中等 | 简单 |
| 安全性 | 高 | 中等 |
| 支持大文件 | ✅ 支持分片上传 | ❌ 不支持 |
| 权限控制 | 精细（RAM Policy） | 较粗 |
| 前端依赖 | 需要OSS SDK | 标准HTTP |
| 适用场景 | 生产环境 | 简单场景 |

### 推荐方案：STS临时授权

综合考虑安全性、功能完整性和扩展性，**本项目采用STS临时授权方案**作为默认方案。

**选型理由：**
1. **安全性更高**：临时凭证自动过期，无需在前端暴露长期密钥
2. **权限控制精细**：通过RAM Policy可精确控制访问权限
3. **支持大文件**：可使用OSS SDK的分片上传功能
4. **阿里云官方推荐**：文档完善，社区支持好
5. **扩展性好**：未来可支持视频等大文件上传

### 工作原理

```
┌─────────┐     1.请求STS凭证      ┌─────────┐
│  前端   │ ───────────────────> │  后端   │
│ 浏览器  │                      │ 服务器  │
└─────────┘                      └────┬────┘
     │                                │
     │                                │ 2.调用STS服务
     │                                │   assumeRole
     │                                ▼
     │                           ┌─────────┐
     │                           │ 阿里云  │
     │                           │  STS    │
     │                           └────┬────┘
     │                                │
     │ 3.返回临时凭证                   │
     │◄───────────────────────────────┘
     │
     │ 4.使用临时凭证直接上传
     │    到OSS
     ▼
┌─────────┐
│ 阿里云  │
│  OSS    │
└─────────┘
```

---

## 后端服务接口

### 1. 获取STS临时凭证

**接口地址：** `POST /api/upload/sts-token`

**请求头：**
```
Authorization: Bearer {accessToken}
Content-Type: application/json
```

**请求参数：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | string | 是 | 上传类型：`avatar`/`product`/`community`/`chat` |

**请求示例：**
```json
{
  "type": "avatar"
}
```

**成功响应：**
```json
{
  "success": true,
  "message": "获取STS凭证成功",
  "data": {
    "accessKeyId": "STS.xxxxxxxx",
    "accessKeySecret": "xxxxxxxx",
    "securityToken": "xxxxxxxx",
    "expiration": "2026-04-23T13:00:00Z",
    "region": "oss-cn-beijing",
    "bucket": "zhuanzhuan-campus",
    "uploadPath": "avatars/3/",
    "uploadConfig": {
      "path": "avatars",
      "maxSize": 2097152,
      "allowedMime": ["image/jpeg", "image/png", "image/gif", "image/webp"],
      "allowedExt": [".jpg", ".jpeg", ".png", ".gif", ".webp"]
    }
  }
}
```

**字段说明：**

| 字段 | 说明 |
|------|------|
| accessKeyId | 临时AccessKeyId |
| accessKeySecret | 临时AccessKeySecret |
| securityToken | 安全令牌（STS凭证必需） |
| expiration | 凭证过期时间（ISO 8601格式） |
| region | OSS区域 |
| bucket | OSS存储桶名称 |
| uploadPath | 完整的上传路径前缀（含userId），前端应使用此字段拼接文件名 |
| uploadConfig | 上传配置限制 |

**错误响应：**
```json
{
  "success": false,
  "message": "不支持的上传类型: invalid_type"
}
```

### 2. 获取签名URL（备选方案）

**接口地址：** `POST /api/upload/signed-url`

**请求头：**
```
Authorization: Bearer {accessToken}
Content-Type: application/json
```

**请求参数：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | string | 是 | 上传类型 |
| filename | string | 是 | 原始文件名（用于生成路径和校验） |

**请求示例：**
```json
{
  "type": "product",
  "filename": "product-image.jpg"
}
```

**成功响应：**
```json
{
  "success": true,
  "message": "获取签名URL成功",
  "data": {
    "url": "https://zhuanzhuan-campus.oss-cn-beijing.aliyuncs.com/products/2026/04/23/xxx.jpg?OSSAccessKeyId=xxx&Expires=xxx&Signature=xxx",
    "ossPath": "products/2026/04/23/12345_1776946309480_5jynp3.jpg",
    "fileUrl": "https://zhuanzhuan-campus.oss-cn-beijing.aliyuncs.com/products/2026/04/23/xxx.jpg",
    "expires": 900,
    "uploadConfig": {
      "maxSize": 5242880,
      "allowedMime": ["image/jpeg", "image/png", "image/gif", "image/webp"],
      "allowedExt": [".jpg", ".jpeg", ".png", ".gif", ".webp"]
    }
  }
}
```

**字段说明：**

| 字段 | 说明 |
|------|------|
| url | 带签名的上传URL（PUT请求） |
| ossPath | OSS存储路径 |
| fileUrl | 文件访问URL |
| expires | URL有效期（秒） |

---

## 前端集成指南

### 方案一：使用OSS SDK（推荐）

#### 1. 安装依赖

```bash
npm install ali-oss
```

#### 2. 封装上传服务

```javascript
// services/upload.js
import OSS from 'ali-oss';
import { request } from './request'; // 你的HTTP请求封装

/**
 * 获取STS凭证
 * @param {string} type - 上传类型
 * @returns {Promise<Object>} STS凭证
 */
async function getSTSToken(type) {
  const response = await request.post('/api/upload/sts-token', { type });
  return response.data;
}

/**
 * 上传文件到OSS
 * @param {File} file - 文件对象
 * @param {string} type - 上传类型
 * @param {Function} onProgress - 进度回调
 * @returns {Promise<string>} 文件URL
 */
export async function uploadFile(file, type, onProgress) {
  try {
    // 1. 获取STS凭证
    const stsData = await getSTSToken(type);
    
    // 2. 创建OSS客户端
    const client = new OSS({
      region: stsData.region,
      accessKeyId: stsData.accessKeyId,
      accessKeySecret: stsData.accessKeySecret,
      stsToken: stsData.securityToken,
      bucket: stsData.bucket,
      secure: true, // 使用HTTPS
    });
    
    // 3. 验证文件
    const config = stsData.uploadConfig;
    if (file.size > config.maxSize) {
      const maxMB = (config.maxSize / 1024 / 1024).toFixed(1);
      throw new Error(`文件大小超过限制，最大允许 ${maxMB}MB`);
    }
    
    if (!config.allowedMime.includes(file.type)) {
      throw new Error(`不支持的文件类型，仅支持 ${config.allowedExt.join(', ')}`);
    }
    
    // 4. 生成文件路径
    const ext = file.name.split('.').pop().toLowerCase();
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const datePath = new Date().toISOString().slice(0, 10).replace(/-/g, '/');
    const ossPath = `${stsData.uploadPath}${datePath}/${timestamp}_${random}.${ext}`;
    
    // 5. 上传文件
    const result = await client.put(ossPath, file, {
      progress: (p) => {
        if (onProgress) {
          onProgress(Math.round(p * 100));
        }
      },
      headers: {
        'Cache-Control': 'public, max-age=31536000',
      },
    });
    
    return result.url;
  } catch (error) {
    console.error('上传失败:', error);
    throw error;
  }
}

/**
 * 多文件上传
 * @param {File[]} files - 文件列表
 * @param {string} type - 上传类型
 * @param {Function} onProgress - 进度回调 (index, percent)
 * @returns {Promise<string[]>} 文件URL列表
 */
export async function uploadMultipleFiles(files, type, onProgress) {
  const urls = [];
  for (let i = 0; i < files.length; i++) {
    const url = await uploadFile(files[i], type, (percent) => {
      if (onProgress) {
        onProgress(i, percent);
      }
    });
    urls.push(url);
  }
  return urls;
}
```

#### 3. 在组件中使用

```vue
<template>
  <div class="upload-component">
    <input
      type="file"
      accept="image/*"
      @change="handleFileChange"
      :disabled="uploading"
    />
    <div v-if="uploading" class="progress">
      上传进度: {{ progress }}%
    </div>
    <div v-if="imageUrl" class="preview">
      <img :src="imageUrl" alt="预览" />
    </div>
  </div>
</template>

<script>
import { uploadFile } from '@/services/upload';

export default {
  data() {
    return {
      uploading: false,
      progress: 0,
      imageUrl: '',
    };
  },
  methods: {
    async handleFileChange(event) {
      const file = event.target.files[0];
      if (!file) return;
      
      this.uploading = true;
      this.progress = 0;
      
      try {
        // 上传头像
        this.imageUrl = await uploadFile(file, 'avatar', (percent) => {
          this.progress = percent;
        });
        
        // 保存URL到后端
        await this.saveAvatar(this.imageUrl);
        
        this.$message.success('上传成功');
      } catch (error) {
        this.$message.error(error.message || '上传失败');
      } finally {
        this.uploading = false;
      }
    },
    
    async saveAvatar(url) {
      // 调用后端API保存头像URL
      await request.put('/api/users/profile', { avatar: url });
    },
  },
};
</script>
```

### 方案二：使用签名URL

适用于不想引入OSS SDK的简单场景。

```javascript
/**
 * 使用签名URL上传文件
 * @param {File} file - 文件对象
 * @param {string} type - 上传类型
 */
async function uploadWithSignedUrl(file, type) {
  // 1. 获取签名URL
  const response = await request.post('/api/upload/signed-url', {
    type,
    filename: file.name,
  });
  
  const { url, fileUrl } = response.data;
  
  // 2. 使用PUT请求直接上传
  const result = await fetch(url, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type,
    },
  });
  
  if (!result.ok) {
    throw new Error('上传失败');
  }
  
  return fileUrl;
}
```

---

## 安全注意事项

### 1. 最小权限原则

STS凭证仅授予以下权限：
- `oss:PutObject` - 仅允许上传文件
- 限制只能上传到指定路径前缀
- 限制只能上传到指定Bucket

**禁止授予的权限：**
- 下载文件（GetObject）
- 删除文件（DeleteObject）
- 列出文件（ListObjects）

### 3. 路径隔离

不同上传类型的文件存储在不同路径，防止越权访问：

```
avatars/{userId}/*          - 用户头像
products/{userId}/*         - 正式商品图片
products/{userId}/temp/*    - AI 分析临时图片（按用户隔离）
community/{userId}/*        - 社区帖子图片
chat/{userId}/*             - 聊天图片
```

**重要：** 前端应使用 STS 响应中的 `uploadPath` 字段作为上传路径前缀，不要自行拼接路径。`uploadPath` 已包含用户 ID，确保路径正确且安全。

### AI 发布临时图片说明

当使用 AI 智能发布商品时，图片上传流程如下：

1. **前端上传**：调用 `POST /api/upload/sts-token`（`type=product`），获取的 STS 凭证包含 `products/{userId}/temp/` 的写入权限
2. **上传路径**：前端使用 STS 响应中的 `tempPath` 字段，上传到 `products/{userId}/temp/{timestamp}_{random}.jpg`
3. **AI 分析**：将临时图片 URL 传给 `/api/ai-products/analyze` 接口
4. **确认发布**：用户确认后，后端将图片从 `products/{userId}/temp/` 复制到 `products/{userId}/` 正式路径
5. **自动清理**：未发布的临时图片保留 7 天后自动删除（按用户目录扫描）

### 3. 凭证有效期

- STS凭证有效期：1小时
- 签名URL有效期：15分钟
- 缓存机制：凭证在过期前5分钟内会重新获取

### 4. 文件类型和大小限制

| 类型 | 最大尺寸 | 允许格式 |
|------|----------|----------|
| avatar | 2MB | jpg, jpeg, png, gif, webp |
| product | 5MB | jpg, jpeg, png, gif, webp |
| community | 5MB | jpg, jpeg, png, gif, webp |
| chat | 5MB | jpg, jpeg, png, gif, webp |

### 5. 身份验证

获取凭证的接口必须：
- 验证用户登录状态
- 验证用户权限
- 记录操作日志

---

## 环境变量配置

### 必需配置

```env
# OSS基础配置
OSS_REGION=oss-cn-beijing
OSS_BUCKET=zhuanzhuan-campus
OSS_ACCESS_KEY_ID=your-access-key-id
OSS_ACCESS_KEY_SECRET=your-access-key-secret

# STS角色ARN（生产环境必需）
OSS_STS_ROLE_ARN=acs:ram::1234567890123456:role/zhuanzhuan-campus-sts-role
```

### 配置说明

**OSS_STS_ROLE_ARN 获取步骤：**

1. 登录阿里云RAM控制台
2. 创建角色（选择"阿里云服务"->"OSS"）
3. 添加权限策略：

```json
{
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "oss:PutObject",
      "Resource": [
        "acs:oss:*:*:zhuanzhuan-campus/avatars/*",
        "acs:oss:*:*:zhuanzhuan-campus/products/*",
        "acs:oss:*:*:zhuanzhuan-campus/community/*",
        "acs:oss:*:*:zhuanzhuan-campus/chat/*"
      ]
    }
  ],
  "Version": "1"
}
```

4. 复制角色ARN到环境变量

### 开发环境

开发环境可以不配置 `OSS_STS_ROLE_ARN`，系统会使用简化模式（直接使用OSS AK/SK），但会有警告日志。

**⚠️ 警告：简化模式仅用于开发测试，生产环境必须使用STS！**

---

## 最佳实践

### 1. 前端优化

**分片上传（大文件）：**
```javascript
// 使用OSS SDK的分片上传
await client.multipartUpload(ossPath, file, {
  progress: (p) => console.log(`${Math.round(p * 100)}%`),
  partSize: 1024 * 1024, // 1MB分片
});
```

**断点续传：**
```javascript
// 检查已上传的分片，实现断点续传
const checkpoint = localStorage.getItem('upload_checkpoint');
await client.multipartUpload(ossPath, file, {
  checkpoint: checkpoint ? JSON.parse(checkpoint) : undefined,
  progress: (p, checkpoint) => {
    localStorage.setItem('upload_checkpoint', JSON.stringify(checkpoint));
  },
});
```

**图片压缩：**
```javascript
// 上传前压缩图片
import Compressor from 'compressorjs';

new Compressor(file, {
  quality: 0.8,
  maxWidth: 1920,
  success(compressedFile) {
    uploadFile(compressedFile, type);
  },
});
```

### 2. 错误处理

```javascript
async function uploadWithRetry(file, type, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await uploadFile(file, type);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      // STS凭证可能过期，等待后重试
      if (error.message.includes('STS')) {
        await new Promise(r => setTimeout(r, 1000));
      } else {
        throw error;
      }
    }
  }
}
```

### 3. 进度显示

```vue
<template>
  <div class="uploader">
    <div v-for="(file, index) in files" :key="index" class="file-item">
      <span>{{ file.name }}</span>
      <div class="progress-bar">
        <div class="progress" :style="{ width: file.progress + '%' }"></div>
      </div>
      <span>{{ file.status }}</span>
    </div>
  </div>
</template>
```

---

## 故障排查

### 常见问题

#### 1. "OSS 配置不完整" 错误

**原因：** 环境变量未正确配置

**解决：**
```bash
# 检查环境变量
echo $OSS_ACCESS_KEY_ID
echo $OSS_REGION

# 确保.env文件存在且配置正确
cat .env | grep OSS
```

#### 2. "AccessDenied" 错误

**原因：** STS凭证权限不足或过期

**解决：**
- 检查RAM Policy配置
- 确认凭证未过期
- 检查文件路径是否在授权范围内

#### 3. "SignatureDoesNotMatch" 错误

**原因：** 签名URL使用方式错误

**解决：**
- 确保使用PUT请求
- 确保Content-Type与生成URL时一致
- 确保在有效期内使用

#### 4. 上传速度慢

**优化建议：**
- 使用分片上传
- 启用OSS传输加速
- 使用CDN上传域名
- 压缩图片后再上传

### 调试技巧

**开启OSS SDK调试日志：**
```javascript
const client = new OSS({
  // ... 配置
  verbose: true, // 开启详细日志
});
```

**查看STS凭证详情：**
```javascript
const stsData = await getSTSToken('avatar');
console.log('STS凭证:', {
  accessKeyId: stsData.accessKeyId,
  expiration: stsData.expiration,
  region: stsData.region,
  bucket: stsData.bucket,
});
```

---

## 更新日志

### v2.0.0 (2026-04-23)

- 移除后端代理上传接口（`/avatar`、`/product`、`/community`、`/chat`）
- 全面采用前端直传模式
- 保留STS临时授权和签名URL两种方案
- 更新文档以反映新的上传流程

### v1.0.0 (2026-04-23)

- 初始版本
- 实现后端代理上传模式
- 实现STS临时授权方案
- 实现签名URL备选方案
- 提供完整的前端集成示例
- 添加安全注意事项和最佳实践

---

## 参考文档

- [阿里云OSS文档](https://help.aliyun.com/document_detail/31817.html)
- [阿里云STS文档](https://help.aliyun.com/document_detail/28756.html)
- [ali-oss SDK文档](https://github.com/ali-sdk/ali-oss)
- [RAM Policy语法](https://help.aliyun.com/document_detail/58932.html)
