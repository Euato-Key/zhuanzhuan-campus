# Web Search MCP

基于自建爬虫的 MCP Server，提供联网搜索和网页内容抓取能力。不依赖任何付费搜索 API，零成本使用。

## 功能

| 工具 | 说明 |
|------|------|
| `web_search` | 搜索网页，返回标题、URL、摘要列表。优先 DuckDuckGo，失败自动降级 Bing |
| `web_fetch` | 抓取指定 URL 的网页内容，清洗后转为 Markdown 返回 |

## 安装

```bash
npm install
npm run build
```

## 配置到 MCP 客户端

以 Claude Desktop 为例，在 `claude_desktop_config.json` 中添加：

```json
{
  "mcpServers": {
    "web-search": {
      "command": "node",
      "args": ["path/to/Solo/dist/index.js"]
    }
  }
}
```

## 开发脚本

```bash
npm run build       # 编译 TypeScript
npm run typecheck   # 类型检查
npm run start       # 运行编译后的服务
npm run dev         # 编译 + 运行
```

## 怎么工作的

```
用户调用 web_search ──→ DuckDuckGo HTML ──→ 解析结果
                                │ 失败
                                └──→ Bing ──→ 解析结果

用户调用 web_fetch ──→ 检查 Content-Type ──→ 抓取 HTML
                                │
                                ├── cheerio 移除 script/style/nav 等
                                └── turndown 转 Markdown
```

## 项目结构

```
src/
├── index.ts    # MCP Server 入口，注册工具
├── http.ts     # HTTP 封装（UA、速率限制、超时）
├── search.ts   # 搜索引擎爬虫
└── fetch.ts    # 网页抓取与 Markdown 转换
```