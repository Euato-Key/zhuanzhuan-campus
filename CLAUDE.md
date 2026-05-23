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

## 开发要点

- **前后端分离**: 前端 5173 端口，后端 3000 端口，前端通过 Vite 代理访问后端 API
- **环境变量**: 前端用 `.env`，后端用 `backend/.env`
- **TypeScript**: 注意类型规范，尽量避免 `any`；前端 ESM，后端 CommonJS
- **Element Plus**: 已配置自动导入，无需手动 import 组件
- **API 文档**: OpenAPI 规范文档在 `docs/openapi/`，写完后端 API 记得同步更新
- **样式规范**: 清新校园风设计系统，主色 `#4CAF50`，SCSS 变量在 `frontend/src/assets/styles/_variables.scss`，AI 相关样式集中在 `_ai-recognition.scss`
- **实验性代码**: `Experimental_code/` 目录可供代码探索，不影响主项目

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
@import '@/assets/styles/variables';

.my-component {
  color: $color-primary;
  border-radius: $radius-md;
}
</style>
```

详细规范见 `docs/frontend/样式风格规范.md`
