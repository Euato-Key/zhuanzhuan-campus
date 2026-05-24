# AI模块

## 概述

AI模块提供基于大语言模型的智能服务，目前主要支持商品图片识别功能。通过上传商品图片，AI自动识别商品信息并返回结构化数据（分类、名称、描述、成色、估价等），帮助用户快速填写商品发布表单。

底层使用 OpenAI SDK 兼容的 API 接口（阿里云百炼/DashScope），支持同步调用、流式调用和 thinking 模式。

**v2.0 新增**：整合 MCP（Model Context Protocol）服务，支持多阶段识别流程——图片识别 → 联网搜索 → 页面抓取 → 信息融合，通过联网搜索补充商品参数和价格信息，显著提升识别准确度。当 MCP 服务不可用时，自动降级为纯 AI 图片识别模式。

## 文件结构

```
backend/src/
├── modules/ai/
│   ├── ai.routes.ts            # 主路由（挂载子路由）
│   ├── ai.controller.ts        # 图片识别控制器
│   ├── ai.service.ts           # 图片识别服务（多阶段流程）
│   ├── recognition.service.ts  # 识别业务逻辑（含MCP多阶段、降级模式）
│   ├── ai.prompts.ts           # AI提示词构建器（Phase 1 / Phase 4 / 降级模式 / 助手）
│   ├── ai.types.ts             # 类型定义与常量（含多阶段类型）
│   ├── audit.controller.ts     # AI审核控制器
│   ├── audit.service.ts        # AI审核服务
│   ├── audit.routes.ts         # AI审核路由
│   ├── assistant.controller.ts # AI助手控制器（SSE流式）
│   ├── assistant.service.ts    # AI助手服务（工具调用 + XML解析）
│   ├── assistant-tools.ts      # AI助手工具定义与执行（搜索/订单/统计/卡片）
│   ├── assistant.routes.ts     # AI助手路由
│   ├── conversation.service.ts # 对话持久化服务（消息保存/查询）
│   └── ai.prompts.ts           # AI提示词构建器
├── services/
│   ├── ai.service.ts           # 共享AI客户端（OpenAI SDK封装）
│   └── mcp-client.service.ts   # MCP客户端（连接MCP Server，调用搜索/抓取工具）
└── config/
    └── env.ts                  # 环境变量配置（含MCP相关配置）
```

## API 接口

### 用户接口（需登录）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/ai/recognize` | AI商品图片识别（支持MCP多阶段流程） |

### 管理员接口（需登录 + 管理员权限）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/ai/audit/:productId` | AI商品审核 |
| GET | `/api/ai/audit/:productId/status` | 获取商品审核状态 |

### 用户接口 - AI助手（需登录）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/ai/assistant/chat` | AI助手对话（SSE流式） |
| GET | `/api/ai/assistant/conversations` | 获取用户对话列表 |
| GET | `/api/ai/assistant/conversations/:id/messages` | 获取对话消息列表 |
| DELETE | `/api/ai/assistant/conversations/:id` | 删除对话 |

## 核心流程：商品图片识别

### 多阶段识别流程（MCP模式）

当 `MCP_ENABLED=true` 时，识别流程分为5个阶段：

```
Phase 1: 图片识别 + 搜索关键词生成
    ┌─────────────────────────────────────────────────┐
    │  输入: 商品图片 + 可选的名称/品牌提示            │
    │  处理: AI VLM 分析图片                           │
    │  输出:                                          │
    │    - identification: 品牌、型号、分类、关键特征   │
    │    - searchKeywords: 搜索关键词列表              │
    │    - preliminaryData: 初步商品结构化数据          │
    └─────────────────────────────────────────────────┘
                            │
                            ▼
Phase 2: 联网搜索
    ┌─────────────────────────────────────────────────┐
    │  输入: Phase 1 生成的搜索关键词（最多3个）       │
    │  处理: MCP web_search 工具搜索                   │
    │  输出: 搜索结果列表（标题、URL、摘要）           │
    │  去重: 按 URL 去重                               │
    └─────────────────────────────────────────────────┘
                            │
                            ▼
Phase 3: 页面抓取
    ┌─────────────────────────────────────────────────┐
    │  输入: Phase 2 的搜索结果                        │
    │  处理:                                          │
    │    1. URL评分排序（官方域名加分、参数/评测加分）  │
    │    2. 选取评分最高的 N 个URL（MCP_FETCH_MAX_PAGES）│
    │    3. MCP web_fetch 工具抓取页面内容             │
    │  输出: 抓取的页面内容列表                        │
    └─────────────────────────────────────────────────┘
                            │
                            ▼
Phase 4: 信息融合
    ┌─────────────────────────────────────────────────┐
    │  输入:                                          │
    │    - Phase 1 的 identification + preliminaryData │
    │    - Phase 2 的搜索结果                          │
    │    - Phase 3 的页面内容                          │
    │  处理: AI LLM 融合所有信息                       │
    │  输出: 最终结构化商品数据 + 置信度               │
    └─────────────────────────────────────────────────┘
                            │
                            ▼
Phase 5: 结果规范化
    ┌─────────────────────────────────────────────────┐
    │  处理: 字段校验、枚举映射、价格取整等            │
    │  输出: AIRecognitionResult                       │
    └─────────────────────────────────────────────────┘
```

### 降级模式（无MCP）

当 `MCP_ENABLED=false` 或 MCP 服务不可用时，自动降级为纯 AI 图片识别模式：

```
用户上传图片 → AI VLM 直接识别 → 规范化 → 返回结果
```

降级模式下，`phases` 字段中 `phase2Completed`、`phase3Completed`、`phase4Completed` 均为 `false`，`mcpUsed` 为 `false`。

### 容错机制

| 阶段 | 失败处理 |
|------|----------|
| Phase 1 解析失败 | 使用请求中的 brand/name 构造 fallback 数据，搜索关键词为"品牌+名称+规格参数" |
| Phase 2 搜索失败 | 跳过 Phase 2/3/4，直接使用 Phase 1 的初步结果 |
| Phase 3 抓取失败 | 跳过 Phase 3/4，使用 Phase 1 初步结果 + Phase 2 搜索摘要进行融合 |
| Phase 4 融合失败 | 降级使用 Phase 1 的初步结果 |
| MCP 服务不可用 | 完全降级为纯 AI 图片识别模式 |

### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| images | string[] | 是 | 商品图片OSS路径，1-9张，需以 `products/` 开头 |
| name | string | 否 | 商品名称提示，帮助AI更准确识别 |
| brand | string | 否 | 品牌提示，帮助AI更准确识别 |

### 响应结构

```typescript
interface AIRecognitionResult {
  data: Partial<CreateProductData>;   // 识别出的商品信息
  confidence: Record<string, number>; // 各字段置信度 (0-1)
  warnings: string[];                 // 警告信息
  rawResponse: string;                // AI原始返回（调试用）
  phases: RecognitionPhases;          // 多阶段流程执行状态
}

interface RecognitionPhases {
  phase1Completed: boolean;    // 图片识别是否完成
  phase2Completed: boolean;    // 联网搜索是否完成
  phase3Completed: boolean;    // 页面抓取是否完成
  phase4Completed: boolean;    // 信息融合是否完成
  searchResultsCount: number;  // 搜索结果数量
  fetchedPagesCount: number;   // 成功抓取的页面数量
  mcpUsed: boolean;            // 是否使用了MCP服务
}

interface PhaseDetails {
  phase1?: Phase1Detail;  // Phase 1 图片识别的详细数据
  phase2?: Phase2Detail;  // Phase 2 联网搜索的详细数据
  phase3?: Phase3Detail;  // Phase 3 页面抓取的详细数据
  phase4?: Phase4Detail;  // Phase 4 信息融合的详细数据
}
```

### phaseDetails 字段说明

`phaseDetails` 提供每个阶段的详细中间结果，前端可据此展示识别进度 UI：

| 阶段 | 包含内容 | 前端可展示 |
|------|----------|-----------|
| Phase1 | `identification`（品牌/型号/特征）、`searchKeywords`、`thinkingContent`、`durationMs` | "识别到 **Apple iPhone 15 Pro**，钛金属原色，正在搜索..." |
| Phase2 | `searchResults`（完整搜索结果列表）、`keywords`、`durationMs` | "搜索到 8 条结果：中关村在线、Apple官网..." |
| Phase3 | `fetchedPages`（页面摘要：URL/标题/内容长度）、`selectedUrls`、`durationMs` | "已抓取 zol.com.cn (12KB)、apple.com.cn (8KB)..." |
| Phase4 | `thinkingContent`（AI融合推理）、`durationMs` | "正在融合网页信息..." |

各子类型详细定义：

```typescript
interface Phase1Detail {
  identification: Phase1Identification;  // 品牌/型号/分类/关键特征
  searchKeywords: string[];              // 搜索关键词
  thinkingContent?: string;              // AI图片分析的思考过程
  durationMs: number;                    // 耗时(毫秒)
}

interface Phase2Detail {
  searchResults: WebSearchResult[];  // 完整搜索结果(标题/URL/摘要)
  keywords: string[];                // 使用的搜索关键词
  durationMs: number;                // 耗时(毫秒)
}

interface Phase3Detail {
  fetchedPages: FetchedPageDetail[];   // 页面摘要(不含完整内容，避免响应过大)
  selectedUrls: string[];              // 被选中抓取的URL（按评分排序）
  durationMs: number;                  // 耗时(毫秒)
}

interface Phase4Detail {
  thinkingContent?: string;  // AI融合推理的思考过程
  durationMs: number;        // 耗时(毫秒)
}

interface FetchedPageDetail {
  url: string;             // 页面URL
  title: string;           // 页面标题
  contentLength: number;   // 页面内容字符数
  fetchError?: string;     // 抓取错误（如有）
}

interface WebSearchResult {
  title: string;    // 搜索结果标题
  url: string;      // 结果URL
  snippet: string;  // 摘要片段
}
```

> **注意**：`Phase3Detail.fetchedPages` 只包含页面摘要信息（URL/标题/内容长度），**不包含完整页面内容**，避免响应数据量过大。完整内容仅在服务端用于 Phase 4 融合阶段。

### 降级模式下的 phaseDetails

当 MCP 不可用时（降级模式），`phaseDetails` 仅包含 `phase1`，其余阶段为 `undefined`。

### data 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| categoryId | number | 分类ID（已校验是否存在于分类列表） |
| name | string | 商品名称（最长100字） |
| description | string | 商品描述（3-5句话） |
| itemCondition | string | 新旧程度：new/99new/95new/90new/80new |
| currentPrice | number | 建议售价（元，保留两位小数） |
| originalPrice | number | 估计原价（元，保留两位小数） |
| tags | string[] | 标签列表（最多5个，每个不超过10字） |
| specs | {name: string, value: string}[] | 规格参数（最多5组） |
| deliveryType | string | 配送方式：self/express/both |
| validDays | 7/15/30/null | 发布有效期 |
| bargain | boolean | 是否允许议价 |
| brand | string | 品牌名称 |

### confidence 字段

AI为每个识别字段返回 0-1 的置信度评分，1表示非常确定。有联网搜索佐证的字段置信度通常更高(0.8-1.0)，纯靠图片推测的字段置信度较低(0.5-0.7)。

### warnings 字段

识别过程中可能产生的警告，常见场景：

| 警告场景 | 示例 |
|----------|------|
| MCP搜索补充 | `已通过联网搜索补充商品信息` |
| 分类ID不存在，按名称匹配 | `AI返回的分类ID 999 不存在，已按名称匹配到"手机"` |
| 分类ID不存在，无法匹配 | `AI返回的分类ID 999 不存在，请手动选择分类` |
| 成色中文映射 | `新旧程度"99成新"已映射为"99new"` |
| 成色无效 | `AI返回的新旧程度"半新"无效，请手动选择` |
| 售价无效 | `AI返回的售价无效，请手动填写` |
| 配送方式无效 | `配送方式"邮寄"无效，已默认为"both"` |
| 有效期调整 | `有效期12天无效，已调整为15天` |
| AI响应解析失败 | `AI返回结果解析失败，请手动填写商品信息` |

## MCP客户端服务 (MCPClientService)

位于 `backend/src/services/mcp-client.service.ts`，封装了与 MCP Server 的通信，提供联网搜索和页面抓取能力。

### 连接管理

MCP Client 使用 stdio 传输方式连接 MCP Server，按需建立连接（首次调用时自动连接），支持断线重连。

```typescript
// 自动连接（首次调用时）
await MCPClientService.webSearch('iPhone 15 参数');

// 手动断开（进程退出时调用）
await MCPClientService.disconnect();
```

### 提供的工具

| 方法 | 说明 | 参数 |
|------|------|------|
| `webSearch(query, count)` | 联网搜索 | query: 搜索关键词, count: 最大结果数(默认10) |
| `webFetch(url)` | 抓取页面内容 | url: 目标URL |
| `fetchMultiplePages(urls)` | 批量抓取多个页面 | urls: URL数组 |
| `disconnect()` | 断开MCP连接 | - |
| `isConnected()` | 检查连接状态 | - |

### 返回类型

```typescript
interface WebSearchResult {
  title: string;    // 搜索结果标题
  url: string;      // 结果URL
  snippet: string;  // 摘要片段
}

interface FetchedPage {
  url: string;          // 页面URL
  title: string;        // 页面标题
  content: string;      // 页面内容（Markdown格式）
  fetchError?: string;  // 抓取错误信息（如有）
}
```

### URL评分选择策略

Phase 3 中，搜索结果URL按以下规则评分排序，选取评分最高的页面抓取：

| 评分项 | 加分 | 说明 |
|--------|------|------|
| 排名位置 | 排名倒序 | 排名越靠前分数越高 |
| 官方域名 | +10 | apple.com, samsung.com, huawei.com, xiaomi.com, jd.com, zol.com.cn 等 |
| 摘要长度>100 | +3 | 较长的摘要通常信息更丰富 |
| 标题含关键词 | +5 | 包含"参数"、"规格"、"评测"、"specs"、"review"、"价格"等 |

## AI提示词构建 (AIPrompts)

位于 `backend/src/modules/ai/ai.prompts.ts`，负责构建识别场景的 system prompt 和 user prompt。

### Phase 1 提示词（图片识别 + 搜索关键词生成）

- **buildPhase1SystemPrompt**: 角色定义 + 分类列表 + 输出格式（含identification和searchKeywords字段）+ 定价参考 + 规则
- **buildPhase1UserPrompt**: 识别指令 + 可选提示 + 图片URL

Phase 1 的输出格式比降级模式多了 `identification` 和 `identification.searchKeywords` 字段，用于驱动后续搜索阶段。

### Phase 4 提示词（信息融合）

- **buildFusionSystemPrompt**: 融合角色定义 + 分类列表 + 输出格式 + 融合规则（优先网页信息、保留图片独有信息、标注置信度）
- **buildFusionUserPrompt**: 图片识别结果 + 搜索结果摘要 + 抓取页面内容

### 降级模式提示词

- **buildRecognitionSystemPrompt**: 标准识别提示词（不含搜索关键词生成）
- **buildRecognitionUserPrompt**: 标准识别用户提示词

## AI响应解析与规范化

### JSON提取

AI返回内容可能被 markdown 代码块包裹，解析逻辑：

1. 优先提取 ` ```json ... ``` ` 代码块
2. 其次匹配 `{ ... }` 大括号内容
3. 兜底使用原始文本

### Phase 1 响应解析

Phase 1 的响应包含额外的 `identification` 字段，解析时需要：

1. 提取 `identification` 对象（brand, model, category, keyFeatures, searchKeywords）
2. 提取标准商品字段作为 `preliminaryData`
3. 提取 `confidence` 对象

### 字段规范化

| 字段 | 规范化逻辑 |
|------|------------|
| categoryId | 校验是否存在于分类列表；不存在则按名称模糊匹配；均失败则不填充并添加警告 |
| name | 截断至100字；若AI未返回则使用请求中的name |
| itemCondition | 支持中文别名映射（如"99成新"→"99new"，"全新"→"new"）；无效值不填充 |
| currentPrice | 取正数，保留两位小数；无效值不填充 |
| originalPrice | 取正数，保留两位小数；无效值不填充 |
| tags | 过滤非字符串、截断至10字、最多5个 |
| specs | 过滤非法结构、最多5组 |
| deliveryType | 校验枚举值；无效则默认"both" |
| validDays | 校验枚举值(7/15/30/null)；数值型则取最近合法值 |
| bargain | 仅接受boolean |
| brand | 若AI未返回则使用请求中的brand |

## 共享AI客户端 (AIClientService)

位于 `backend/src/services/ai.service.ts`，封装了 OpenAI SDK，提供统一的AI调用能力。

### 初始化

使用环境变量配置的 DashScope API Key 和 Base URL 创建 OpenAI 客户端实例（单例模式）：

```typescript
const client = new OpenAI({
  apiKey: env.DASHSCOPE_API_KEY,
  baseURL: env.AI_BASE_URL,
  timeout: env.AI_TIMEOUT,
  maxRetries: env.AI_MAX_RETRIES,
});
```

### 同步调用

```typescript
const result = await AIClientService.chatCompletion(messages, {
  model: 'kimi-k2.6',
  temperature: 0.6,
  enableThinking: true,
});
```

返回 `AIChatResult`：

| 字段 | 类型 | 说明 |
|------|------|------|
| content | string | AI回复内容 |
| thinkingContent | string? | thinking模式下的推理过程 |
| usage | object | Token使用统计 |
| model | string | 实际使用的模型名称 |

### 流式调用

```typescript
for await (const chunk of AIClientService.streamChatCompletion(messages, options)) {
  // chunk.content - 增量内容
  // chunk.thinkingContent - 增量推理内容
  // chunk.done - 是否结束
}
```

### 错误处理

AI客户端会将 OpenAI SDK 错误映射为业务友好的 AppError：

| 原始错误 | 映射结果 |
|----------|----------|
| 429 (Rate Limit) | `AI服务繁忙，请稍后重试` (429) |
| 401 (Auth) | `AI服务配置错误` (500) |
| 5xx (Server) | `AI服务暂时不可用` (503) |
| AbortError (Timeout) | `AI识别超时，请稍后重试` (503) |
| 其他 | `AI服务异常` (500) |

## 环境变量配置

### AI服务相关

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| DASHSCOPE_API_KEY | (空) | 阿里云百炼/DashScope API Key |
| AI_MODEL_NAME | kimi-k2.6 | 使用的模型名称 |
| AI_BASE_URL | https://dashscope.aliyuncs.com/compatible-mode/v1 | API Base URL |
| AI_ENABLE_THINKING | false | 是否启用thinking模式 |
| AI_TEMPERATURE | 0.6 | 生成温度 |
| AI_TIMEOUT | 30000 | 请求超时时间（毫秒） |
| AI_MAX_RETRIES | 2 | 最大重试次数 |

### MCP服务相关

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| MCP_ENABLED | true | 是否启用MCP联网搜索服务 |
| MCP_SERVER_PATH | mcp-servers/web-search-mcp/dist/index.js | MCP Server入口文件路径（相对于backend目录） |
| MCP_SEARCH_MAX_RESULTS | 8 | 每次搜索最大返回结果数 |
| MCP_FETCH_MAX_PAGES | 3 | 每次识别最多抓取的页面数 |

## 依赖关系

```
ai.controller.ts
  ├── ai.service.ts (AIService.recognition.analyze)
  │     ├── services/ai.service.ts (AIClientService.chatCompletion)
  │     ├── services/mcp-client.service.ts (MCPClientService.webSearch/webFetch)
  │     ├── modules/category/category.service.ts (CategoryService.getFlatList)
  │     ├── services/file.service.ts (FileService.getSignedReadUrl)
  │     ├── ai.prompts.ts (AIPrompts.build*)
  │     └── config/env.ts (env.MCP_ENABLED, env.MCP_SEARCH_MAX_RESULTS, etc.)
  └── common/asyncHandler, common/validation, common/errors

mcp-client.service.ts
  └── @modelcontextprotocol/sdk (Client, StdioClientTransport)
      └── mcp-servers/web-search-mcp/dist/index.js (MCP Server进程)
```

## MCP Server

位于 `backend/mcp-servers/web-search-mcp/`，是自建的 MCP Server，提供联网搜索和页面抓取能力。

### 提供的工具

| 工具名 | 说明 | 参数 |
|--------|------|------|
| web_search | 联网搜索 | query: 搜索关键词, count: 最大结果数 |
| web_fetch | 抓取网页内容 | url: 目标URL |

### 通信方式

- 传输协议：stdio（标准输入输出）
- 协议：MCP (Model Context Protocol)
- 启动方式：由后端 MCPClientService 自动启动子进程

详见 [MCP Server README](../../backend/mcp-servers/web-search-mcp/README.md)。

## AI商品审核 (audit)

AI商品审核在商品提交审核时自动触发（需 `ai_audit_enabled` 配置开启），审核结果自动更新商品状态。

```typescript
interface AIAuditResult {
  approved: boolean;       // 是否通过审核
  skipped?: boolean;       // 是否跳过（非 pending 状态）
  riskScore: number;       // 风险评分 (0-1)
  riskCategories: string[];// 风险类别
  details: string;         // 审核详情
  suggestions: string[];   // 修改建议
}
```

管理员也可手动调用 `POST /api/ai/audit/:productId` 触发审核。

## AI助手 (assistant)

AI助手提供对话式交互，支持商品搜索、订单查询、数据统计等功能，通过工具调用（tool-calling）或 XML 标签解析实现与平台数据的交互。响应使用 SSE（Server-Sent Events）流式输出。
