# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

转转校园二手平台 - 校园二手商品交易系统（前端实习项目）

**技术栈**:
- 前端: Vue 3 + TypeScript + Vite + Element Plus + Pinia + Socket.io-client + Sass
- 后端: Node.js + Express + TypeScript + Prisma + Socket.io
- 数据库: MySQL
- 仓库: https://github.com/Euato-Key/zhuanzhuan-campus

---

## 常用命令

### 前端 (frontend/)
```bash
npm run dev          # 启动开发服务器 (port 5173)
npm run build        # 生产构建
npm run preview      # 预览生产构建
```

### 后端 (backend/)
```bash
npm run dev          # 启动开发服务器 (port 3000, 使用 tsx watch 热重载)
npm run build        # 编译 TypeScript 到 dist/
npm start            # 运行编译后的代码
npx prisma generate  # 生成 Prisma Client
npx prisma migrate dev  # 运行数据库迁移
```

### 数据库
- 需先配置 `backend/.env` 中的 `DATABASE_URL`
- SQL脚本在 `Database/` 目录，按模块编号 (01-用户模块.sql, 02-商品模块.sql, ...)

---

## 架构概览

### 后端模块结构

每个业务模块遵循三层架构，位于 `backend/src/modules/<module>/`:

```
product/
├── product.routes.ts      # Express Router，定义路由 + 挂载中间件
├── product.controller.ts  # 请求处理，调用 service，返回统一响应
└── product.service.ts     # 业务逻辑，调用 Prisma 操作数据库
```

**请求流程**: Route → Middleware (auth/admin) → Controller → Service → Prisma → MySQL

**统一响应格式**: 所有接口返回 `{ code: number, data: any, message: string }`，通过 `utils/response.ts` 的 `success()/error()` 辅助函数生成。

**中间件**:
- `auth.ts` - JWT 鉴权，解析 token 后将用户信息挂载到 `req.user`
- `admin.ts` - 管理员权限校验

**服务层** (`backend/src/services/`):
- `ai.service.ts` - AI 图片识别，调用大模型 API
- `mcp.service.ts` - MCP 服务集成（联网搜索、页面抓取），不可用时自动降级
- `file.service.ts` - 文件上传处理

**AI 发布流程**: 图片上传 → AI 图片识别 → MCP 联网搜索 → MCP 页面抓取 → 信息融合 → 返回结构化商品数据。MCP 不可用时降级为纯 AI 图片识别模式。

### 前端架构

**API 封装** (`frontend/src/api/`):
- `index.ts` - 创建 axios 实例，配置 baseURL、请求/响应拦截器（自动附加 token、统一错误处理）
- `modules/*.ts` - 按业务模块封装 API 调用，导出类型定义 + 接口函数

**状态管理** (`frontend/src/stores/`):
- Pinia stores 按业务域划分（user, product, chat 等）
- `user` store 管理 JWT token 和登录状态

**路由** (`frontend/src/router/`):
- 路由守卫检查登录状态，未登录重定向到登录页
- 需要鉴权的页面在 meta 中标记

**AI 发布前端流程**:
- 入口: 商品列表页/我的商品页的 "AI 智能发布" 按钮
- `AiPublishButton.vue` → `AiPublishModal.vue` (三步模态框: 上传图片 → 实时识别进度 → 确认结果)
- `useAiRecognition.ts` composable 管理 AI 识别状态
- 确认后数据传入 `PublishProductDialog.vue` 的 `aiData` prop 自动预填充表单

### WebSocket

使用 Socket.io 实现实时聊天，通过命名空间隔离业务。前后端均配置 Socket.io client/server。

---

## 图片/文件路径规范

**核心原则：数据库存相对 OSS 路径，渲染时用 `getOssUrl()` 拼接完整 URL。由于历史数据中可能存了完整 URL，`getOssUrl()` 必须兼容两种格式。**

### 存储层（后端）
- 数据库 `images`/`detailImages`/`avatar` 等字段**应存相对 OSS 路径**，如 `products/5/temp/xxx.webp`
- **注意**：部分历史数据存了完整 URL（如 `https://zhuanzhuan-campus.oss-cn-beijing.aliyuncs.com/products/...`），所以前端渲染必须全部用 `getOssUrl()` 兼容两种格式

### 上传层
- `uploadImage(file, type)` 返回 `{ url: 完整URL, ossPath: 相对路径 }`
- `url` = `getOssUrl(ossPath)` = `OSS_BASE_URL + ossPath`
- **提交给后端时用 `ossPath`（相对路径），不要用 `url`（完整 URL）**

### 渲染层（前端）—— 所有图片/头像渲染必须用 `getOssUrl()`
- **无例外**：所有 `<img :src>`、`<el-image :src>`、`:preview-src-list`、computed 属性返回图片路径等，**必须**用 `getOssUrl(path)`：
  ```vue
  <!-- 正确 -->
  <img :src="getOssUrl(user.avatar)" />
  <img :src="getOssUrl(product.images[0])" />
  <el-image :preview-src-list="product.images.map(getOssUrl)" />
  const productImage = computed(() => product.images?.[0] ? getOssUrl(product.images[0]) : '/placeholder.png')

  <!-- 错误 —— 数据可能是相对路径，直接 :src 会破图 -->
  <img :src="product.images[0]" />
  <img :src="img" v-for="img in product.images" />
  ```
- `getOssUrl()` 兼容两种格式：传入完整 URL (`https://...`) 时直接返回，传入相对路径时自动拼接 `OSS_BASE_URL`
- 导入方式：`import { getOssUrl } from '@/utils/oss'`

### 常见错误模式
- ❌ 上传后把 `res.data.data.url`（完整URL）存入 formData → 提交到后端 → 数据库存了完整 URL → 其他页面 `getOssUrl()` 导致双重拼接
- ❌ 从 API 拿到图片路径后直接 `<img :src="path">` → 相对路径被浏览器当成页面相对路径，变成 `http://localhost:5173/products/products/...` 破图
- ✅ 上传后存 `res.data.data.ossPath`，渲染时一律 `getOssUrl(path)`

---

## 踉坑记录

> 每次完成修正任务后，把容易反复踩的坑补充到这里。

### 1. 图片路径：OSS 相对路径 vs 完整 URL —— 渲染时必须用 getOssUrl()
- **坑**：数据库可能存相对路径也可能存完整 URL（历史数据不一致），前端 `<img :src="path">` 直接用原始值，相对路径会被浏览器当成页面相对路径拼成 `http://localhost:5173/products/products/...` 导致破图。
- **对策**：**所有图片/头像渲染一律包 `getOssUrl(path)`**，该方法已兼容两种格式。新增数据统一存 `ossPath`（相对路径）。

### 2. AI 识别数据类型转换：`RecognitionData` → `CreateProductData`
- **坑**：`RecognitionData` 中 `deliveryType` 和 `itemCondition` 是 `string`，但 `CreateProductData` 要求枚举类型 `DeliveryType` / `ItemCondition`。直接展开 (`...data`) 或赋值会导致类型错误。
- **对策**：从 `RecognitionData` 提取数据到 `CreateProductData` 时，先解构出 `deliveryType` 和 `itemCondition`，再用 `as DeliveryType` / `as ItemCondition` 显式转换：
  ```ts
  const { deliveryType, itemCondition, ...rest } = data
  const result: Partial<CreateProductData> = {
    ...rest,
    deliveryType: deliveryType as DeliveryType | undefined,
    itemCondition: itemCondition as ItemCondition | undefined,
  }
  ```

### 3. 自提商品必须填写自提地点
- **坑**：后端 `product.service.ts` 对 `deliveryType === 'self' || 'both'` 强制校验 `pickupAddress`，缺失则 400 拒绝。AI 识别默认 `deliveryType` 为自提，但不返回 `pickupAddress`，导致直接发布必失败。
- **对策**：AI 发布流程中，当 `deliveryType` 含自提时，自动从 `userStore.user.school + campus` 填充 `pickupAddress`；若无校园信息，提示用户手动完善。

### 4. AI 发布图片迁移：主图与详情图
- **坑**：用户在 AI 发布上传了 N 张图，点「手动完善」后只有第一张变主图、其余变详情图，但详情图应包含所有图片（含第一张）。
- **对策**：`images = [ossPaths[0]]`（主图取第一张），`detailImages = [...ossPaths]`（详情图包含全部）。

---

## 开发要点

- **前后端分离**: 前端 5173 端口，后端 3000 端口，前端通过 Vite 代理访问后端 API
- **环境变量**: 前端用 `.env`，后端用 `backend/.env`
- **TypeScript**: 注意类型规范，尽量避免 `any`；前端 ESM，后端 CommonJS
- **Element Plus**: 已配置自动导入，无需手动 import 组件
- **API 文档**: OpenAPI 规范文档在 `docs/openapi/`，写完后端 API 记得同步更新
- **踩坑记录**: 每次完成修正任务后，把容易反复踩的坑总结到上方「踩坑记录」章节
- **样式规范**: 清新校园风设计系统，主色 `#4CAF50`，SCSS 变量在 `frontend/src/assets/styles/_variables.scss`，AI 相关样式集中在 `_ai-recognition.scss`
- **实验性代码**: `Experimental_code/` 目录可供代码探索，不影响主项目
- **Git 提交规范**: 提交代码时按变更类型分类提交，不要一次性用一条 commit 混合不同类型的改动。常见分类：
  - `feat:` — 新功能
  - `fix:` — bug 修复 / 缺陷修正
  - `docs:` — 文档更新（API 文档、README、注释等）
  - `style:` — 样式调整（不影响逻辑的 UI 变化）
  - `refactor:` — 重构（不改功能、不改 bug）
  - 同一类型但涉及不同模块的改动可以合并为一条 commit；不同类型必须分开提交
  - **提交信息用中文书写**，类型前缀（feat/fix/docs/style/refactor）保留英文

---

## 样式风格规范

采用**清新校园风**设计系统，体现校园生机与环保理念。

### 色彩系统
- 主色: `#4CAF50` (绿色系)
- 主色深: `#2E7D32`
- 辅助色: 橙色 `#FF9800`、蓝色 `#2196F3`
- 功能色: 成功 `#4CAF50`、警告 `#FF9800`、错误 `#F44336`
- 支持深色模式

### 样式文件结构
```
frontend/src/assets/styles/
├── _variables.scss    # 变量定义（颜色、间距、圆角等）
├── _mixins.scss       # 混合宏
├── _reset.scss        # 重置样式
├── _typography.scss   # 字体排版
├── _components.scss   # 通用组件样式
├── _animations.scss   # 动画定义
└── main.scss          # 入口文件
```

### 使用方式
```scss
<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.my-component {
  color: $color-primary;
  border-radius: $radius-md;
}
</style>
```

详细规范见 `docs/frontend/样式风格规范.md`
