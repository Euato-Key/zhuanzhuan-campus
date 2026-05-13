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
│   └── 前后端技术选型.md    # 技术选型文档
├── Database/                # 数据库SQL脚本
│   ├── 01-用户模块.sql
│   ├── 02-商品模块.sql
│   ├── 03-订单模块.sql
│   └── ...
├── frontend/                # Vue3前端项目
│   ├── src/
│   │   ├── api/             # API封装
│   │   ├── components/      # 组件
│   │   ├── composables/     # 组合式函数
│   │   ├── router/          # 路由配置
│   │   ├── stores/          # Pinia状态管理
│   │   └── views/           # 页面视图
│   └── vite.config.ts
├── backend/                 # Express后端项目
│   ├── src/
│   │   ├── config/          # 配置文件
│   │   ├── modules/         # 业务模块
│   │   ├── common/          # 公共代码
│   │   └── main.ts          # 入口文件
│   └── prisma/              # Prisma ORM
└── .gitignore
```

---

## 开发要点

1. **前后端分离**: 前端运行在5173端口，后端运行在3000端口，前端通过代理访问后端API
2. **环境变量**: 前端用`.env`，后端用`backend/.env`
3. **数据库**: 使用Prisma ORM，SQL脚本在Database目录
4. **API规范**: RESTful风格，响应格式 `{ code: 200, data: {}, message: 'success' }`
5. **WebSocket**: 使用Socket.io实现实时聊天，命名空间隔离业务

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

- 前端使用ESM模块，后端使用CommonJS
- 前端组件自动导入已配置Element Plus
- 后端Prisma需要先配置 DATABASE_URL 环境变量
- GitHub仓库已创建，代码已推送