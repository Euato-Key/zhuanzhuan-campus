<div align="center">

# 🎨 转转校园 · 前端

**校园二手交易平台 — Vue 3 前端应用**

[![Vue 3](https://img.shields.io/badge/Vue-3.5-4FC08D?logo=vuedotjs&logoColor=white)](https://vuejs.org/) [![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/) [![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/) [![Element Plus](https://img.shields.io/badge/Element_Plus-2-409EFF?logo=element&logoColor=white)](https://element-plus.org/) [![Pinia](https://img.shields.io/badge/Pinia-3-FFD859)](https://pinia.vuejs.org/) [![Sass](https://img.shields.io/badge/Sass-1-CC6699?logo=sass&logoColor=white)](https://sass-lang.com/)

</div>

---

## 📐 架构概览

| 项目 | 说明 |
|:-----|:-----|
| 框架 | Vue 3 Composition API + `<script setup>` |
| 构建 | Vite 8 |
| UI 库 | Element Plus（中文 locale，按需自动导入） |
| 状态管理 | Pinia 3 |
| 路由 | Vue Router 4（HTML5 History 模式） |
| HTTP | Axios（统一拦截、Token 注入、401 自动刷新） |
| 实时通信 | Socket.io-client 4 |
| 文件上传 | 阿里云 OSS 前端直传 |
| 样式 | SCSS + 清新校园风设计系统（自动注入变量/混合宏） |
| 类型检查 | vue-tsc + TypeScript strict 模式 |

---

## 📁 目录结构

```
src/
├── api/                        # API 层
│   ├── index.ts                # Axios 实例 + 拦截器
│   └── modules/                # 14 个 API 模块
│       ├── auth.ts             # 认证（登录/注册/验证码/Token 刷新）
│       ├── user.ts             # 用户（资料/密码/头像）
│       ├── product.ts          # 商品（CRUD/收藏/搜索/审核）
│       ├── order.ts            # 订单（创建/支付/发货/收货/退款）
│       ├── chat.ts             # 聊天（会话/消息/黑名单/快捷回复）
│       ├── review.ts           # 评价（创建/追加/列表）
│       ├── want-buy.ts         # 求购（CRUD/评论/点赞）
│       ├── notification.ts     # 通知（列表/已读/未读数）
│       ├── ai.ts               # AI（识别/流式识别）
│       ├── address.ts          # 地址（CRUD/设默认）
│       ├── category.ts         # 分类（树/列表/CRUD）
│       ├── region.ts           # 地区（省/市/区联动）
│       ├── university.ts       # 高校（搜索/列表）
│       └── upload.ts           # 上传（OSS 签名/直传）
├── components/                 # 45 个组件
│   ├── layout/                 #   布局：AppLayout / AppHeader / AppFooter / AdminLayout
│   ├── product/                #   商品：ProductCard / PublishProductDialog / AiPublish*（3）
│   ├── order/                  #   订单：CreateOrderDialog / PaymentDialog
│   ├── review/                 #   评价：ReviewFormDialog / AppendReviewDialog / ReviewCard / ReviewList
│   ├── chat/                   #   聊天：MessageBubble / ChatInput / ConversationItem / OnlineDot / BlockBanner / BlacklistDialog / QuickReplyPanel / ProductCardMessage / OrderCardMessage / ProductPickerDialog / OrderPickerDialog / ReadStatusBadge / TypingIndicator / SearchPanel / MessageSearchDialog
│   ├── want-buy/               #   求购：WantBuyCard / PublishWantBuyDialog / WantBuyCommentList / WantBuyCommentItem
│   ├── notification/           #   通知：NotificationList / NotificationItem / NotificationPopover / NotificationTypeIcon / NotificationDetail
│   ├── address/                #   地址：AddressFormDialog
│   ├── admin/                  #   管理：ProductAuditDialog
│   ├── AuthDialog.vue          #   全局登录/注册弹窗
│   └── AvatarUpload.vue        #   头像上传
├── composables/                # 6 个组合式函数
│   ├── useAuthDialog.ts        #   全局认证弹窗状态
│   ├── useSocket.ts            #   Socket.io 连接管理
│   ├── useAiRecognition.ts     #   AI 识别状态机（idle/uploading/recognizing/success/error）
│   ├── useChatInfiniteScroll.ts#   聊天消息无限滚动
│   ├── useConfirmDialog.ts     #   编程式确认弹窗
│   └── useCountdown.ts         #   倒计时（验证码冷却）
├── stores/                     # 3 个 Pinia Store
│   ├── user.ts                 #   用户：Token / 用户信息 / 登录登出 / 权限判断
│   ├── chat.ts                 #   聊天：会话列表 / 消息 / 未读数 / 在线状态 / 黑名单 / 快捷回复
│   └── notification.ts         #   通知：列表 / 未读数 / 实时推送
├── router/                     # 路由配置
│   └── index.ts                #   27 条路由 + 全局守卫（auth / admin / superAdmin）
├── views/                      # 32 个页面视图
│   ├── home/                   #   首页 + 求购列表
│   ├── product/                #   商品列表 + 商品详情
│   ├── want-buy/               #   求购详情
│   ├── user/                   #   个人资料 / 用户主页 / 我的商品 / 收藏 / 评价 / 地址 / 通知 / 我的求购
│   ├── order/                  #   订单列表 + 订单详情
│   ├── chat/                   #   聊天列表 + 聊天室
│   └── admin/                  #   9 个管理页面（仪表盘/用户/商品/分类/订单/举报/评价/Banner/求购/设置）
├── utils/                      # 工具函数
│   ├── error.ts                #   API 错误处理
│   ├── format.ts               #   格式化（价格/时间/相对时间/手机号/地址）
│   ├── oss.ts                  #   OSS 直传上传
│   └── storage.ts              #   localStorage 封装
├── assets/styles/              # SCSS 设计系统
│   ├── _variables.scss         #   变量（颜色/间距/圆角/字号/阴影/断点/z-index）
│   ├── _variables-private.scss #   内部派生变量
│   ├── _mixins.scss            #   混合宏（flex-center / text-ellipsis / responsive / card-style ...）
│   ├── _reset.scss             #   重置样式
│   ├── _typography.scss        #   字体排版
│   ├── _components.scss        #   Element Plus 主题覆盖 + 通用组件样式
│   ├── _animations.scss        #   动画（fadeIn / slideIn / pulse / spin）
│   ├── _ai-recognition.scss    #   AI 识别组件样式（扫描动画/进度条/骨架屏）
│   └── main.scss               #   入口文件
├── types/                      # 类型声明
│   └── ali-oss.d.ts            #   ali-oss 模块类型
├── App.vue                     # 根组件
└── main.ts                     # 入口（Vue app + 插件注册）
```

---

## 🗺️ 页面路由

### 公开页面

| 路径 | 页面 | 说明 |
|:-----|:-----|:-----|
| `/` | 首页 | 分类导航 + 热门商品 + 热门求购 |
| `/products` | 商品列表 | 筛选/搜索/排序 + 发布入口 + AI 发布入口 |
| `/products/:id` | 商品详情 | 图片轮播 + 信息 + 评价 + 购买/聊天 |
| `/want-buy` | 求购列表 | 求购帖搜索与浏览 |
| `/want-buy/:id` | 求购详情 | 求购信息 + 评论互动 |
| `/user/:id` | 用户主页 | 他人公开资料 + 在售商品 |

### 登录用户

| 路径 | 页面 | 说明 |
|:-----|:-----|:-----|
| `/profile` | 个人资料 | 基本信息/邮箱/密码分区编辑 |
| `/my-products` | 我的商品 | 按状态筛选 + 上下架 + AI 发布入口 |
| `/favorites` | 我的收藏 | 收藏商品列表 |
| `/reviews` | 我的评价 | 发出/收到的评价 |
| `/addresses` | 收货地址 | 地址 CRUD + 设默认 |
| `/orders` | 我的订单 | 按状态筛选 + 全生命周期操作 |
| `/orders/:id` | 订单详情 | 订单信息 + 物流 + 操作按钮 |
| `/chat` | 消息 | 会话列表 + 聊天室（子路由） |
| `/notifications` | 通知中心 | 六类通知 + 实时推送 |
| `/my-want-buys` | 我的求购 | 求购帖管理 |

### 管理后台

| 路径 | 页面 | 权限 |
|:-----|:-----|:-----|
| `/admin` | 仪表盘 | admin |
| `/admin/users` | 用户管理 | admin |
| `/admin/products` | 商品管理/审核 | admin |
| `/admin/categories` | 分类管理 | admin |
| `/admin/orders` | 订单管理 | admin |
| `/admin/reports` | 举报管理 | admin |
| `/admin/reviews` | 评价管理 | admin |
| `/admin/banners` | Banner 管理 | admin |
| `/admin/want-buys` | 求购管理 | admin |
| `/admin/settings` | 系统设置 | super_admin |

---

## 🧩 核心设计

### 路由守卫

- `meta.auth` — 未登录时弹出 `AuthDialog` 登录弹窗，不跳转页面
- `meta.admin` — 校验 `role === 'admin' | 'super_admin'`，否则回首页
- `meta.superAdmin` — 仅 `super_admin` 可访问，否则回管理仪表盘
- 有 Token 但无用户数据时，守卫自动调用 `fetchUser()` 恢复状态

### Axios 拦截器

- **请求拦截**：自动注入 `Authorization: Bearer <token>`
- **响应拦截**：401 清除认证并跳转登录、403 提示无权限、其他错误统一 `ElMessage` 提示

### Socket.io 实时通信

- 聊天和通知各维护独立 Socket 连接
- 自动携带 JWT 认证、断线重连
- 事件：`chat:new_message` / `chat:typing_indicator` / `chat:online_status` / `notification:new` / `notification:unread_count`

### AI 智能发布流程

```
上传图片 → AI 四阶段识别（SSE 流式推送） → 预览/编辑结果 → 预填充发布表单
```

- `AiPublishButton` → `AiPublishModal`（三步流程）
- `useAiRecognition` 管理状态机：`idle → uploading → recognizing → success/error`
- MCP 不可用时自动降级为纯 AI 图片识别

### SCSS 设计系统

- **自动注入**：`_variables.scss` 和 `_mixins.scss` 通过 Vite `additionalData` 全局注入，组件内无需手动 `@import`
- **清新校园风**：主色 `#4CAF50`，辅助色橙 `#FF9800` / 蓝 `#2196F3`
- **响应式断点**：sm(576px) / md(768px) / lg(992px) / xl(1200px)
- **常用混合宏**：`flex-center` / `flex-between` / `text-ellipsis` / `text-ellipsis-multi($lines)` / `responsive($bp)` / `card-style`

---

## 🚀 开发

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

访问 `http://localhost:5173`，API 请求自动代理到 `http://localhost:3000`。

### 构建

```bash
npm run build
```

先执行 `vue-tsc` 类型检查，再由 Vite 构建产物到 `dist/`。

### 其他命令

```bash
npm run preview    # 预览生产构建
npm run lint       # ESLint 检查 + 自动修复
```

---

## ⚙️ 配置

### Vite 配置要点

| 配置 | 说明 |
|:-----|:-----|
| `@` 路径别名 | 指向 `src/` |
| Element Plus 按需导入 | `unplugin-auto-import` + `unplugin-vue-components` + `ElementPlusResolver` |
| API 代理 | `/api` → `localhost:3000`，`/socket.io` → `localhost:3000`（WebSocket） |
| SCSS 全局注入 | 变量 + 混合宏自动注入每个组件 |
| Vue DevTools | 开发环境自动启用 |

### 环境变量

| 变量 | 说明 | 默认值 |
|:-----|:-----|:-------|
| `VITE_API_BASE_URL` | API 基础路径 | `/api` |

---

## 📊 项目规模

| 类型 | 数量 |
|:-----|:----:|
| 页面视图 | 32 |
| 组件 | 45 |
| 组合式函数 | 6 |
| Pinia Store | 3 |
| API 模块 | 14 |
| 路由 | 27 |
| SCSS 文件 | 9 |
