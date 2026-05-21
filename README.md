<div align="center">

# 🏫 转转校园

**校园二手交易平台**

[![Vue 3](https://img.shields.io/badge/Vue-3-4FC08D?logo=vuedotjs&logoColor=white)](https://vuejs.org/) [![Express 5](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)](https://expressjs.com/) [![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/) [![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/) [![MySQL](https://img.shields.io/badge/MySQL-8-4479A1?logo=mysql&logoColor=white)](https://www.mysql.com/) [![Socket.io](https://img.shields.io/badge/Socket.io-4-010101?logo=socketdotio&logoColor=white)](https://socket.io/)

校园二手商品交易系统 — 商品发布与交易 · 求购 · 实时聊天 · AI 智能识别发布

</div>

---

## ✨ 功能亮点

| 模块 | 说明 |
|:-----|:-----|
| 👤 **用户系统** | 邮箱验证码注册/登录、JWT 双 Token 鉴权、个人信息管理、信用评分 |
| 🛍️ **商品模块** | 发布/编辑/上下架、分类筛选、收藏、审核、AI 智能识别发布（拍照→识别→预填充） |
| 📦 **订单模块** | 完整交易流程：下单→支付→发货/自提→收货，退款退货流程 |
| 📢 **求购模块** | 发布求购、评论回复、点赞、标记已找到 |
| 💬 **实时聊天** | Socket.io 即时通讯、文字/图片/商品卡片/订单卡片、黑名单、快捷回复、砍价模板 |
| ⭐ **评价系统** | 买卖互评、追加评价、评分统计、管理员审核 |
| 🔔 **通知系统** | 系统/商品/订单/聊天/评价/互动六类通知，实时推送 |
| 🛠️ **管理后台** | 用户/商品/订单/举报/评价/求购/分类/Banner 管理，超级管理员系统设置 |
| 🤖 **AI 智能发布** | 上传商品图片，AI 四阶段识别（图片识别→联网搜索→页面抓取→信息融合），自动预填充发布表单，MCP 不可用时降级为纯 AI 识别 |

---

## 🧰 技术栈

<table>
<tr>
<td width="120" align="center"><strong>前端</strong></td>
<td>
<img src="https://img.shields.io/badge/Vue-3-4FC08D?logo=vuedotjs&logoColor=white" />
<img src="https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white" />
<img src="https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white" />
<img src="https://img.shields.io/badge/Element_Plus-2-409EFF?logo=element&logoColor=white" />
<img src="https://img.shields.io/badge/Pinia-3-FFD859" />
<img src="https://img.shields.io/badge/Sass-1-CC6699?logo=sass&logoColor=white" />
</td>
</tr>
<tr>
<td align="center"><strong>后端</strong></td>
<td>
<img src="https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white" />
<img src="https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white" />
<img src="https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma&logoColor=white" />
<img src="https://img.shields.io/badge/Socket.io-4-010101?logo=socketdotio&logoColor=white" />
</td>
</tr>
<tr>
<td align="center"><strong>数据库</strong></td>
<td>
<img src="https://img.shields.io/badge/MySQL-8-4479A1?logo=mysql&logoColor=white" />
</td>
</tr>
<tr>
<td align="center"><strong>基础设施</strong></td>
<td>
阿里云 OSS（前端直传） · 阿里云 DashScope（Kimi 模型） · MCP 联网搜索
</td>
</tr>
</table>

---

## 📁 项目结构

```
zhuanzhuan-campus/
├── frontend/                # Vue 3 前端
│   ├── src/
│   │   ├── api/             # 14 个 API 模块
│   │   ├── components/      # 37 个组件
│   │   ├── composables/     # 6 个组合式函数
│   │   ├── router/          # 24 条路由
│   │   ├── stores/          # 3 个 Pinia Store
│   │   ├── views/           # 24 个页面视图
│   │   └── assets/styles/   # SCSS 设计系统
│   └── vite.config.ts
├── backend/                 # Express 后端
│   ├── src/
│   │   ├── modules/         # 14 个业务模块（routes/controller/service）
│   │   ├── services/        # AI、文件、MCP 客户端服务
│   │   ├── middlewares/     # auth、admin、optionalAuth
│   │   ├── common/          # 错误处理、分页、密码、Token、验证、定时任务
│   │   └── config/          # 环境变量、Prisma、Socket 配置
│   ├── prisma/              # Prisma Schema（22 个模型、18 个枚举）
│   └── mcp-servers/         # MCP 联网搜索服务
├── Database/                # SQL 建表脚本
└── docs/                    # 需求文档、技术选型、OpenAPI 规范、模块文档
```

---

## 🚀 快速开始

### 📋 前置条件

- ![Node.js](https://img.shields.io/badge/Node.js->=18-339933?logo=nodedotjs&logoColor=white)
- ![MySQL](https://img.shields.io/badge/MySQL->=5.7-4479A1?logo=mysql&logoColor=white)
- 阿里云 OSS 配置（文件上传）
- 阿里云 DashScope API Key（AI 识别，可选）

### 1️⃣ 克隆项目

```bash
git clone https://github.com/Euato-Key/zhuanzhuan-campus.git
cd zhuanzhuan-campus
```

### 2️⃣ 初始化数据库

创建 MySQL 数据库，按顺序执行 `Database/` 目录下的 SQL 脚本：

```bash
# 01-用户模块.sql → 02-商品模块.sql → 03-订单模块.sql → ...
```

### 3️⃣ 启动后端

```bash
cd backend
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env，填写 DATABASE_URL、JWT 密钥、OSS 配置等

# 生成 Prisma Client
npx prisma generate

# 启动开发服务器
npm run dev
```

> 后端运行在 `http://localhost:3000`

### 4️⃣ 启动前端

```bash
cd frontend
npm install

# 启动开发服务器
npm run dev
```

> 前端运行在 `http://localhost:5173`，API 请求自动代理到后端

### 5️⃣ 创建管理员

```bash
cd backend
npm run create-admin
```

---

## ⚙️ 环境变量

### 后端 (`backend/.env`)

| 变量 | 说明 | 必填 |
|:-----|:-----|:----:|
| `DATABASE_URL` | MySQL 连接字符串 | ✅ |
| `JWT_ACCESS_SECRET` | Access Token 签名密钥 | ✅ |
| `JWT_REFRESH_SECRET` | Refresh Token 签名密钥 | ✅ |
| `OSS_REGION` | 阿里云 OSS 区域 | ✅ |
| `OSS_BUCKET` | 阿里云 OSS Bucket | ✅ |
| `OSS_ACCESS_KEY_ID` | 阿里云 AccessKey ID | ✅ |
| `OSS_ACCESS_KEY_SECRET` | 阿里云 AccessKey Secret | ✅ |
| `DASHSCOPE_API_KEY` | DashScope API Key | ⭕ |
| `MCP_ENABLED` | 是否启用 MCP 联网搜索（默认 true） | ⭕ |

> 完整配置项见 `backend/src/config/env.ts`

---

## 📚 文档

| 文档 | 路径 |
|:-----|:-----|
| OpenAPI 规范 | `docs/openapi/` — 覆盖全部 14 个 API 模块 |
| 样式风格规范 | `docs/frontend/样式风格规范.md` |
| 需求规格说明 | `docs/需求.md` |
| 技术选型文档 | `docs/前后端技术选型.md` |
| 后端模块文档 | `docs/backend/` — 22 个模块文档 |
| 数据库文档 | `Database/index.md` |

---

## 🎨 设计风格

采用**清新校园风**设计系统，主色 `#4CAF50`（绿色）。

---

<div align="center">

**ISC License**

</div>
