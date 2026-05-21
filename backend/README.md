<div align="center">

# ⚙️ 转转校园 · 后端

**校园二手交易平台 — Node.js 后端服务**

[![Express 5](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)](https://expressjs.com/) [![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/) [![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/) [![Socket.io](https://img.shields.io/badge/Socket.io-4-010101?logo=socketdotio&logoColor=white)](https://socket.io/) [![MySQL](https://img.shields.io/badge/MySQL-8-4479A1?logo=mysql&logoColor=white)](https://www.mysql.com/)

</div>

---

## 📐 架构概览

| 项目 | 说明 |
|:-----|:-----|
| 运行时 | Node.js >= 18 |
| 框架 | Express 5 + TypeScript |
| ORM | Prisma 6（MySQL） |
| 实时通信 | Socket.io 4（聊天 + 通知命名空间隔离） |
| 认证 | JWT 双 Token（Access 15min + Refresh 7d） |
| 文件上传 | 阿里云 OSS 前端直传（后端签发 STS 临时凭证） |
| AI | 阿里云 DashScope（Kimi 模型）+ MCP 联网搜索 |
| 定时任务 | node-cron（自动收货、订单超时取消、商品过期下架） |
| 模块结构 | 三层架构：Routes → Controller → Service |

---

## 📁 目录结构

```
src/
├── main.ts                     # 入口：Express 启动 + 中间件注册 + Socket 初始化
├── config/                     # 配置
│   ├── env.ts                  #   环境变量校验与导出（zod 风格校验）
│   ├── prisma.ts               #   Prisma Client 单例
│   └── socket.ts               #   Socket.io 服务端配置
├── modules/                    # 14 个业务模块
│   ├── auth/                   #   认证（登录/注册/验证码/Token 刷新）
│   ├── user/                   #   用户（资料/密码/头像/信用分）
│   ├── product/                #   商品（CRUD/上下架/收藏/搜索/审核）
│   ├── order/                  #   订单（创建/支付/发货/收货/退款/退货）
│   ├── chat/                   #   聊天（会话/消息/黑名单/快捷回复/砍价模板）
│   ├── review/                 #   评价（创建/追加/列表/统计）
│   ├── want-buy/               #   求购（CRUD/评论/点赞/标记已找到）
│   ├── notification/           #   通知（创建/列表/已读/未读数）
│   ├── ai/                     #   AI 识别（图片识别/流式识别/MCP 联网搜索）
│   ├── address/                #   收货地址（CRUD/设默认）
│   ├── category/               #   分类（树/列表/CRUD）
│   ├── region/                 #   地区（省/市/区联动）
│   ├── university/             #   高校（搜索/列表）
│   └── upload/                 #   上传（OSS STS 签名/直传凭证）
├── services/                   # 跨模块服务
│   ├── ai.service.ts           #   AI 识别服务（DashScope + MCP 四阶段流程）
│   ├── file.service.ts         #   文件服务（OSS STS 签发）
│   └── mcp-client.service.ts   #   MCP 客户端（联网搜索/页面抓取）
├── middlewares/                 # 中间件
│   ├── auth.ts                 #   JWT 认证（必须登录）
│   ├── admin.ts                #   管理员权限（admin / super_admin）
│   └── optionalAuth.ts         #   可选认证（有 Token 则解析，无则跳过）
├── common/                     # 公共模块
│   ├── error.ts                #   AppError 类 + 全局错误处理中间件
│   ├── pagination.ts           #   分页参数解析与响应封装
│   ├── password.ts             #   bcrypt 密码哈希/验证
│   ├── token.ts                #   JWT 签发/验证/刷新
│   ├── validation.ts           #   请求参数校验工具
│   └── scheduled-tasks.ts      #   定时任务（自动收货/超时取消/过期下架）
└── types/                      # 类型声明
    └── express.d.ts            #   Express Request 扩展（user 字段）

prisma/
└── schema.prisma               # 数据模型（22 个模型 + 18 个枚举）

mcp-servers/
└── web-search/                 # MCP 联网搜索服务（独立进程）
```

---

## 🗄️ 数据模型

### 核心模型

| 模型 | 说明 | 关键字段 |
|:-----|:-----|:---------|
| `User` | 用户 | email, nickname, password, avatar, creditScore, role, universityId |
| `Product` | 商品 | title, description, price, originalPrice, images, status, categoryId, sellerId |
| `Order` | 订单 | orderNo, totalAmount, status, paymentMethod, deliveryMethod, buyerId, sellerId |
| `OrderItem` | 订单项 | productId, quantity, price |
| `ChatConversation` | 聊天会话 | type(private/group), lastMessage, lastMessageAt |
| `ChatMessage` | 聊天消息 | content, type(text/image/product_card/order_card), read |
| `Review` | 评价 | rating, content, images, type(as_seller/as_buyer), isAnonymous |
| `WantBuy` | 求购 | title, description, budget, categoryId, isFound |
| `Notification` | 通知 | type(6 类), title, content, isRead |

### 关联模型

| 模型 | 说明 |
|:-----|:-----|
| `ProductImage` | 商品图片（排序） |
| `Favorite` | 用户收藏 |
| `Category` | 商品分类（树形，parentId 自关联） |
| `Address` | 收货地址（省/市/区） |
| `University` | 高校 |
| `Region` | 地区（省/市/区三级） |
| `Banner` | 首页轮播图 |
| `Report` | 举报记录 |
| `SystemSetting` | 系统设置（KV） |
| `ChatParticipant` | 会话参与者 |
| `QuickReply` | 快捷回复模板 |
| `BargainTemplate` | 砍价模板 |
| `Blacklist` | 黑名单 |
| `WantBuyComment` | 求购评论 |
| `WantBuyLike` | 求购点赞 |
| `RefreshToken` | Refresh Token 存储 |
| `ReviewImage` | 评价图片 |
| `NotificationSetting` | 通知偏好设置 |

### 枚举

`UserRole` · `UserStatus` · `ProductStatus` · `OrderStatus` · `PaymentMethod` · `DeliveryMethod` · `RefundStatus` · `ChatType` · `MessageType` · `ReviewType` · `WantBuyStatus` · `NotificationType` · `ReportType` · `ReportStatus` · `BannerPosition` · `BannerStatus` · `ConversationType` · `ReadStatus`

---

## 🔌 API 端点

### 认证 `/api/auth`

| 方法 | 路径 | 权限 | 说明 |
|:-----|:-----|:----:|:-----|
| POST | `/register` | - | 邮箱注册 |
| POST | `/login` | - | 邮箱密码登录 |
| POST | `/send-code` | - | 发送邮箱验证码 |
| POST | `/refresh` | - | 刷新 Access Token |
| POST | `/logout` | ✅ | 登出（吊销 Refresh Token） |

### 用户 `/api/users`

| 方法 | 路径 | 权限 | 说明 |
|:-----|:-----|:----:|:-----|
| GET | `/me` | ✅ | 获取当前用户信息 |
| PUT | `/me` | ✅ | 更新个人资料 |
| PUT | `/me/password` | ✅ | 修改密码 |
| POST | `/me/avatar` | ✅ | 上传头像 |
| GET | `/:id` | - | 获取用户公开信息 |
| GET | `/:id/products` | - | 获取用户在售商品 |
| GET | `/:id/reviews` | - | 获取用户评价统计 |

### 商品 `/api/products`

| 方法 | 路径 | 权限 | 说明 |
|:-----|:-----|:----:|:-----|
| GET | `/` | - | 商品列表（筛选/搜索/排序/分页） |
| POST | `/` | ✅ | 发布商品 |
| GET | `/:id` | - | 商品详情 |
| PUT | `/:id` | ✅ | 编辑商品 |
| DELETE | `/:id` | ✅ | 删除商品 |
| PUT | `/:id/status` | ✅ | 上下架 |
| POST | `/:id/favorite` | ✅ | 收藏/取消收藏 |
| GET | `/favorites` | ✅ | 我的收藏 |
| GET | `/my` | ✅ | 我的商品 |
| GET | `/search` | - | 搜索商品 |

### 订单 `/api/orders`

| 方法 | 路径 | 权限 | 说明 |
|:-----|:-----|:----:|:-----|
| POST | `/` | ✅ | 创建订单 |
| GET | `/` | ✅ | 我的订单列表 |
| GET | `/:id` | ✅ | 订单详情 |
| PUT | `/:id/pay` | ✅ | 支付 |
| PUT | `/:id/ship` | ✅ | 发货 |
| PUT | `/:id/confirm` | ✅ | 确认收货 |
| PUT | `/:id/cancel` | ✅ | 取消订单 |
| POST | `/:id/refund` | ✅ | 申请退款 |
| PUT | `/:id/refund/approve` | ✅ | 同意退款 |
| PUT | `/:id/refund/reject` | ✅ | 拒绝退款 |
| PUT | `/:id/refund/confirm` | ✅ | 确认退货 |

### 聊天 `/api/chat`

| 方法 | 路径 | 权限 | 说明 |
|:-----|:-----|:----:|:-----|
| GET | `/conversations` | ✅ | 会话列表 |
| POST | `/conversations` | ✅ | 创建会话 |
| GET | `/conversations/:id/messages` | ✅ | 消息记录（分页） |
| POST | `/conversations/:id/messages` | ✅ | 发送消息 |
| PUT | `/conversations/:id/read` | ✅ | 标记已读 |
| GET | `/blacklist` | ✅ | 黑名单列表 |
| POST | `/blacklist` | ✅ | 添加黑名单 |
| DELETE | `/blacklist/:userId` | ✅ | 移除黑名单 |
| GET | `/quick-replies` | ✅ | 快捷回复列表 |
| POST | `/quick-replies` | ✅ | 添加快捷回复 |
| DELETE | `/quick-replies/:id` | ✅ | 删除快捷回复 |
| GET | `/bargain-templates` | ✅ | 砍价模板列表 |

### 评价 `/api/reviews`

| 方法 | 路径 | 权限 | 说明 |
|:-----|:-----|:----:|:-----|
| POST | `/` | ✅ | 创建评价 |
| POST | `/:id/append` | ✅ | 追加评价 |
| GET | `/product/:productId` | - | 商品评价列表 |
| GET | `/user/:userId` | - | 用户评价统计 |

### 求购 `/api/want-buy`

| 方法 | 路径 | 权限 | 说明 |
|:-----|:-----|:----:|:-----|
| GET | `/` | - | 求购列表 |
| POST | `/` | ✅ | 发布求购 |
| GET | `/:id` | - | 求购详情 |
| PUT | `/:id` | ✅ | 编辑求购 |
| DELETE | `/:id` | ✅ | 删除求购 |
| PUT | `/:id/found` | ✅ | 标记已找到 |
| POST | `/:id/comments` | ✅ | 评论 |
| GET | `/:id/comments` | - | 评论列表 |
| POST | `/:id/like` | ✅ | 点赞/取消点赞 |

### 通知 `/api/notifications`

| 方法 | 路径 | 权限 | 说明 |
|:-----|:-----|:----:|:-----|
| GET | `/` | ✅ | 通知列表 |
| GET | `/unread-count` | ✅ | 未读数量 |
| PUT | `/:id/read` | ✅ | 标记已读 |
| PUT | `/read-all` | ✅ | 全部已读 |

### AI 识别 `/api/ai`

| 方法 | 路径 | 权限 | 说明 |
|:-----|:-----|:----:|:-----|
| POST | `/recognize` | ✅ | 图片识别（同步） |
| POST | `/recognize/stream` | ✅ | 流式识别（SSE，四阶段推送） |

### 其他

| 模块 | 前缀 | 权限 | 说明 |
|:-----|:-----|:----:|:-----|
| 地址 | `/api/addresses` | ✅ | CRUD + 设默认 |
| 分类 | `/api/categories` | -/✅ | 树/列表（公开），CRUD（管理员） |
| 地区 | `/api/regions` | - | 省/市/区三级联动 |
| 高校 | `/api/universities` | - | 搜索/列表 |
| 上传 | `/api/upload` | ✅ | OSS STS 临时凭证签发 |
| 管理 | `/api/admin/*` | 🔒 | 用户/商品/订单/举报/评价/求购/分类/Banner/设置 |

---

## 🔌 Socket.io 事件

聊天和通知使用独立命名空间隔离。

### 聊天命名空间 `/chat`

| 事件 | 方向 | 说明 |
|:-----|:----:|:-----|
| `chat:join` | C→S | 加入会话房间 |
| `chat:leave` | C→S | 离开会话房间 |
| `chat:send_message` | C→S | 发送消息 |
| `chat:new_message` | S→C | 新消息推送 |
| `chat:typing` | C→S | 正在输入 |
| `chat:typing_indicator` | S→C | 输入指示器 |
| `chat:online` | S→C | 用户上线 |
| `chat:offline` | S→C | 用户离线 |
| `chat:message_read` | C→S | 消息已读 |
| `chat:read_status` | S→C | 已读状态更新 |

### 通知命名空间 `/notification`

| 事件 | 方向 | 说明 |
|:-----|:----:|:-----|
| `notification:new` | S→C | 新通知推送 |
| `notification:unread_count` | S→C | 未读数更新 |

---

## 🤖 AI 识别流程

```
用户上传图片
    │
    ▼
┌─────────────────┐
│  阶段 1：图片识别  │  DashScope Vision API 识别商品
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  阶段 2：联网搜索  │  MCP 搜索服务查找商品信息
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  阶段 3：页面抓取  │  MCP 抓取搜索结果详情页
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  阶段 4：信息融合  │  AI 整合所有数据，输出结构化结果
└─────────────────┘
```

- MCP 不可用时自动降级为纯 AI 图片识别（仅阶段 1）
- 流式识别通过 SSE 推送各阶段进度
- 输出结构化数据：标题、描述、价格、分类、成色等

---

## ⏰ 定时任务

| 任务 | 周期 | 说明 |
|:-----|:-----|:-----|
| 自动收货 | 每小时 | 发货超过 7 天自动确认收货 |
| 订单超时取消 | 每小时 | 未支付订单超过 30 分钟自动取消 |
| 商品过期下架 | 每天 0 点 | 超过 90 天未更新的商品自动下架 |

---

## 🔐 认证机制

```
登录 → 签发 AccessToken(15min) + RefreshToken(7d)
  │
  ├─ 请求 API → Authorization: Bearer <AccessToken>
  │     ├─ 有效 → 正常响应
  │     └─ 过期 → 前端自动调用 /auth/refresh
  │                ├─ RefreshToken 有效 → 签发新 AccessToken
  │                └─ RefreshToken 过期 → 跳转登录
  │
  └─ 登出 → 吊销 RefreshToken
```

- AccessToken 存前端内存，RefreshToken 存 localStorage
- RefreshToken 在数据库中存储，支持服务端吊销
- 中间件：`auth`（必须登录）/ `optionalAuth`（可选登录）/ `admin`（管理员）

---

## 🚀 开发

### 安装依赖

```bash
npm install
```

### 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env`，填写以下必填项：

| 变量 | 说明 |
|:-----|:-----|
| `DATABASE_URL` | MySQL 连接字符串，如 `mysql://root:password@localhost:3306/zhuanzhuan_campus` |
| `JWT_ACCESS_SECRET` | AccessToken 签名密钥 |
| `JWT_REFRESH_SECRET` | RefreshToken 签名密钥 |
| `OSS_REGION` | 阿里云 OSS 区域 |
| `OSS_BUCKET` | 阿里云 OSS Bucket |
| `OSS_ACCESS_KEY_ID` | 阿里云 AccessKey ID |
| `OSS_ACCESS_KEY_SECRET` | 阿里云 AccessKey Secret |

可选配置：

| 变量 | 说明 | 默认值 |
|:-----|:-----|:-------|
| `DASHSCOPE_API_KEY` | DashScope API Key（AI 识别） | - |
| `MCP_ENABLED` | 是否启用 MCP 联网搜索 | `true` |
| `PORT` | 服务端口 | `3000` |

### 初始化数据库

```bash
# 生成 Prisma Client
npx prisma generate

# 同步数据库结构（开发环境）
npx prisma db push
```

或按顺序执行 `Database/` 目录下的 SQL 脚本建表。

### 启动开发服务器

```bash
npm run dev
```

服务运行在 `http://localhost:3000`。

### 构建

```bash
npm run build
```

TypeScript 编译到 `dist/`。

### 其他命令

```bash
npm start              # 运行编译后的生产代码
npm run create-admin   # 交互式创建管理员账户
npx prisma studio      # 打开 Prisma 数据库管理界面
```

---

## 📊 项目规模

| 类型 | 数量 |
|:-----|:----:|
| 业务模块 | 14 |
| API 端点 | 70+ |
| 数据模型 | 22 |
| 枚举类型 | 18 |
| 中间件 | 3 |
| Socket 事件 | 12 |
| 定时任务 | 3 |
