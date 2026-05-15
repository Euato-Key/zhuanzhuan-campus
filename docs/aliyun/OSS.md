# 阿里云 OSS 文件上传服务

## 概述

本项目使用阿里云对象存储（OSS）作为文件存储方案，采用**前端直传**模式：

```
前端 → 请求凭证/签名URL → 后端
前端 → 直接上传文件 → 阿里云 OSS
```

后端仅提供 STS 临时凭证或签名 URL，文件数据不经过服务器，减轻带宽和计算压力。

## 环境变量配置

在 `.env` 文件中配置以下变量：

```env
OSS_REGION=oss-cn-hangzhou
OSS_ACCESS_KEY_ID=your-access-key-id
OSS_ACCESS_KEY_SECRET=your-access-key-secret
OSS_BUCKET=your-bucket-name
OSS_STS_ROLE_ARN=acs:ram::1234567890123456:role/your-role-name
```

> **注意**：`OSS_STS_ROLE_ARN` 为生产环境必需，开发环境可不配置（会降级为简化模式，有警告日志）。

## 架构设计

### 文件上传流程（前端直传）

```
┌──────────┐    1.请求凭证/签名URL    ┌──────────────┐
│  前端     │ ──────────────────────→ │   后端服务    │
│ (浏览器)  │                        │  (Express)   │
└────┬─────┘                        └──────────────┘
     │
     │ 2.使用凭证/URL直接上传
     │
     ▼
┌──────────┐
│ 阿里云   │
│  OSS     │
└──────────┘
```

### 核心模块

| 模块       | 文件                                   | 职责                                                                      |
| ---------- | -------------------------------------- | ------------------------------------------------------------------------- |
| 文件服务   | `src/services/file.service.js`         | OSS 客户端管理、类型配置、路径生成、STS 凭证签发、签名 URL 生成            |
| 上传控制器 | `src/controllers/upload.controller.js` | 处理获取 STS 凭证和签名 URL 的请求                                         |
| 上传路由   | `src/routes/upload.routes.js`          | 路由定义：`/sts-token`、`/signed-url`                                     |

## 支持的上传类型

| 类型     | 路径前缀    | 单张大小 | 数量限制 | 适用场景     |
| -------- | ----------- | -------- | -------- | ------------ |
| avatar   | `avatars/`  | 2MB      | 1张      | 用户头像     |
| product  | `products/` | 5MB      | 9张      | 商品图片     |
| community| `community/`| 5MB      | 9张      | 社区帖子图片 |
| chat     | `chat/`     | 5MB      | 1张      | 聊天图片     |

所有类型支持格式：JPG、JPEG、PNG、GIF、WebP

## API 接口

### POST /api/upload/sts-token

获取阿里云 STS 临时凭证，用于前端使用 ali-oss SDK 直传。

**请求**：`application/json`

```json
{
  "type": "avatar"
}
```

**响应示例**：

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
    "uploadConfig": {
      "path": "avatars",
      "maxSize": 2097152,
      "allowedMime": ["image/jpeg", "image/png", "image/gif", "image/webp"],
      "allowedExt": [".jpg", ".jpeg", ".png", ".gif", ".webp"]
    }
  }
}
```

### POST /api/upload/signed-url

获取带签名的临时上传 URL，用于前端直接 PUT 上传（不依赖 ali-oss SDK）。

**请求**：`application/json`

```json
{
  "type": "product",
  "filename": "product-image.jpg"
}
```

**响应示例**：

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

## OSS 存储路径规则

```
{path}/{年/月/日}/{用户ID}_{时间戳}_{随机6位}.{扩展名}
```

示例：

```
avatars/2026/04/20/6_1776696000000_abc123.jpg
products/2026/04/20/6_1776697000000_def456.png
community/2026/05/01/8_1776700000000_xyz789.webp
chat/2026/05/01/8_1776701000000_qwe012.gif
```

## 安全注意事项

- OSS 长期凭证仅存储在后端 `.env` 文件中，**绝不暴露给前端**
- 前端仅获取**临时 STS 凭证**（1小时有效期）或**签名 URL**（15分钟有效期）
- 文件类型和大小由后端通过 `uploadConfig` 告知前端，前端需自行校验
- 上传接口需要登录认证
- OSS Bucket 建议配置为**私有读写**，通过签名 URL 或 STS 授权访问

## 扩展指南

### 新增上传类型

只需 2 步：

**1. 在 `file.service.js` 的 `UPLOAD_TYPES` 中添加配置**：

```javascript
const UPLOAD_TYPES = {
  avatar: { ... },
  product: { ... },
  community: { ... },
  chat: { ... },
  // 新增类型
  certificate: {
    path: "certificates",
    maxSize: 10 * 1024 * 1024,
    maxCount: 3,
    allowedMime: ["image/jpeg", "image/png", "application/pdf"],
    allowedExt: [".jpg", ".jpeg", ".png", ".pdf"],
  },
};
```

**2. 更新 OpenAPI 文档** `docs/openapi/upload.yaml`

## 依赖

- `ali-oss` ^6.23.0 — 阿里云 OSS Node.js SDK
- `@alicloud/sts-sdk` — 阿里云 STS SDK
