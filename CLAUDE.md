# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## 项目概述

转转校园二手平台 - 校园二手商品交易系统（前端实习项目）

**技术栈**:
- 前端: Vue 3 + TypeScript + Vite + Element Plus + Pinia + Socket.io-client + Sass
- 后端: Node.js + Express + TypeScript + Prisma + Socket.io
- 数据库: MySQL
- 仓库: https://github.com/Euato-Key/zhuanzhuan-campus
---

## 项目结构

```
zhuanzhuan-campus/
├── docs/                    # 项目文档
│   ├── 需求.md              # 需求规格说明
│   ├── backend/             # 后端项目文档
│   ├── frontend/            # 前端项目文档
│   ├── openapi/             # OpenAPI文档，每次写完后端API记得更新到这里
│   └── 前后端技术选型.md    # 技术选型文档
├── Database/                # 数据库SQL脚本
│   ├── 01-用户模块.sql
│   ├── 02-商品模块.sql
│   ├── 03-订单模块.sql
│   └── ...
├── frontend/                # Vue3前端项目
│   ├── src/
│   │   ├── api/             # API封装
│   │   │   └── modules/
│   │   │       └── ai.ts    # AI识别API模块（类型定义+接口）
│   │   ├── components/      # 组件
│   │   │   └── product/
│   │   │       ├── PublishProductDialog.vue  # 发布商品对话框（支持AI预填充）
│   │   │       ├── AiPublishButton.vue       # AI智能发布入口按钮
│   │   │       ├── AiPublishModal.vue        # AI发布模态框（三步流程）
│   │   │       ├── AiRecognitionProgress.vue # AI识别多阶段进度展示
│   │   │       └── AiRecognitionResult.vue   # AI识别结果预览与确认
│   │   ├── composables/     # 组合式函数
│   │   │   └── useAiRecognition.ts  # AI识别状态管理
│   │   ├── router/          # 路由配置
│   │   ├── stores/          # Pinia状态管理
│   │   └── views/           # 页面视图
│   │       ├── product/
│   │       │   └── list.vue # 商品列表页（含AI发布入口）
│   │       └── user/
│   │           └── myProducts.vue  # 我的商品页（含AI发布入口）
│   └── vite.config.ts
├── backend/                 # Express后端项目
│   ├── src/
│   │   ├── config/          # 配置文件
│   │   ├── modules/         # 业务模块
│   │   ├── common/          # 公共代码
│   │   └── main.ts          # 入口文件
│   └── prisma/              # Prisma ORM
└── .gitignore                  # 忽略文件
├── Experimental_code/        # 实验性代码目录（claude code可以在里面进行代码探索）
├── CLAUDE.md                 # Claude Code 指南文件
```

---

## 开发要点

1. **前后端分离**: 前端运行在5173端口，后端运行在3000端口，前端通过代理访问后端API
2. **环境变量**: 前端用`.env`，后端用`backend/.env`
3. **数据库**: 使用Prisma ORM，SQL脚本在Database目录
4. **API规范**: RESTful风格，响应格式 `{ code: 200, data: {}, message: 'success' }`
5. **WebSocket**: 使用Socket.io实现实时聊天，命名空间隔离业务
6. **AI智能发布**: 通过上传商品图片，AI自动识别后执行多阶段流程（图片识别→联网搜索→页面抓取→信息融合），返回结构化商品数据预填充到发布表单。MCP服务不可用时自动降级为纯AI图片识别模式。

### AI发布前端架构
- **入口**: 商品列表页和我的商品页均有"AI 智能发布"按钮（绿色渐变主题，与常规发布区分）
- **流程**: 三步模态框（上传图片 → 实时查看识别进度 → 确认结果），每步展示阶段详情
- **集成点**: 
  - `PublishProductDialog` 支持 `aiData` prop，自动预填充 AI 识别结果
  - 分类ID自动校验，不存在时警告提示
- **样式**: AI相关样式集中在 `assets/styles/_ai-recognition.scss`，遵循品牌色彩系统

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
### 规范文档
详细规范见 `docs/frontend/样式风格规范.md`

---

## 注意事项
- 写TS代码时，要注意类型规范，尽量避免使用any类型
- 前端使用ESM模块，后端使用CommonJS
- 前端组件自动导入已配置Element Plus
- 后端Prisma需要先配置 DATABASE_URL 环境变量
- GitHub仓库已创建，代码已推送