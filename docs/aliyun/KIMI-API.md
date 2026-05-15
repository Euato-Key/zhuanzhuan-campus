# 阿里云百炼 Kimi API 调用指南（OpenAI 兼容模式）

> 本文档基于项目实际跑通的实验代码整理，涵盖：非流式/流式调用、思考/非思考模式、多模态（图片/视频/文档）输入、返回结果提取等完整用法。
>
> 适用模型：`kimi-k2.6`、`kimi-k2.5`、`kimi-k2-thinking`
>
> 官方文档：https://help.aliyun.com/zh/model-studio/kimi-api

---

## 目录

1. [环境准备](#1-环境准备)
2. [基础配置](#2-基础配置)
3. [非流式调用（直接返回）](#3-非流式调用直接返回)
4. [流式调用（逐字输出）](#4-流式调用逐字输出)
5. [思考模式详解](#5-思考模式详解)
6. [多模态输入](#6-多模态输入)
7. [返回结果结构详解](#7-返回结果结构详解)
8. [完整代码示例汇总](#8-完整代码示例汇总)
9. [常见问题](#9-常见问题)

---

## 1. 环境准备

### 1.1 安装依赖

```bash
npm install openai dotenv
```

`package.json` 依赖示例：

```json
{
  "dependencies": {
    "dotenv": "^17.4.2",
    "openai": "^6.34.0"
  }
}
```

### 1.2 配置环境变量 `.env`

```env
# 阿里云百炼 API Key（必须）
DASHSCOPE_API_KEY=sk-6080f455f781471d8172cdbde550b00a

# 模型名称（可选，默认 qwen-plus）
# kimi-k2.6     - 最新最智能，支持多模态+思考
# kimi-k2.5     - 支持多模态+思考
# kimi-k2-thinking - 仅支持思考模式
AI_MODEL_NAME=kimi-k2.6
```

### 1.3 初始化客户端

```javascript
const OpenAI = require("openai");
const dotenv = require("dotenv");
const path = require("path");

// 加载 .env 文件
dotenv.config({ path: path.join(__dirname, ".env") });

// 创建 OpenAI 兼容客户端
const client = new OpenAI({
  apiKey: process.env.DASHSCOPE_API_KEY,
  baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
});
```

> **重要**：必须使用 `"https://dashscope.aliyuncs.com/compatible-mode/v1"` 作为 `baseURL`，这是阿里云百炼的 OpenAI 兼容接口地址。

---

## 2. 基础配置

### 2.1 模型选择

| 模型 | 思考模式 | 多模态 | 特点 |
|------|---------|--------|------|
| `kimi-k2.6` | 支持开关 | 支持 | 最新最智能，长程代码、指令遵循、自我纠错能力强 |
| `kimi-k2.5` | 支持开关 | 支持 | Agent、代码生成、视觉理解 SOTA |
| `kimi-k2-thinking` | 仅思考 | 不支持 | 深度思考，编码和工具调用能力强 |
| `Moonshot-Kimi-K2-Instruct` | 不支持 | 不支持 | 直接生成，响应速度快 |

### 2.2 关键参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `model` | string | - | 模型名称 |
| `messages` | array | - | 对话消息列表 |
| `stream` | boolean | false | 是否开启流式输出 |
| `enable_thinking` | boolean | false | 是否开启思考模式（kimi-k2.6/kimi-k2.5） |
| `temperature` | number | 思考1.0/非思考0.6 | 采样温度，控制随机性 |
| `top_p` | number | 0.95 | 核采样概率阈值 |
| `presence_penalty` | number | 0.02 | 重复惩罚系数 |

---

## 3. 非流式调用（直接返回）

非流式调用会等待模型生成完整回复后一次性返回，适合不需要实时展示的场景。

### 3.1 基础对话（非思考模式）

```javascript
const OpenAI = require("openai");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, ".env") });

const client = new OpenAI({
  apiKey: process.env.DASHSCOPE_API_KEY,
  baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
});

async function main() {
  const response = await client.chat.completions.create({
    model: process.env.AI_MODEL_NAME || "qwen-plus",
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: "你是谁？" },
    ],
    // 不设置 enable_thinking，或显式设为 false
    // enable_thinking: false,
  });

  // 提取回复内容
  const msg = response.choices[0].message;
  console.log("回复内容:", msg.content);
}

main();
```

### 3.2 思考模式（非流式）

开启思考模式后，模型会先进行内部推理（thinking），再给出正式回复。思考内容通过 `reasoning_content` 字段返回。

```javascript
async function main() {
  const response = await client.chat.completions.create({
    model: "kimi-k2.6",
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: "9.11 和 9.9 哪个大？请仔细思考" },
    ],
    enable_thinking: true, // 开启思考模式
  });

  const msg = response.choices[0].message;

  // 打印思考过程
  if (msg.reasoning_content) {
    console.log("\n" + "=".repeat(20) + "思考过程" + "=".repeat(20) + "\n");
    console.log(msg.reasoning_content);
  }

  // 打印正式回复
  console.log("\n" + "=".repeat(20) + "完整回复" + "=".repeat(20) + "\n");
  console.log(msg.content);
}

main();
```

**返回结构示例：**

```json
{
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "在数学上，9.9 更大...",
        "reasoning_content": "这是一个比较 9.9 和 9.11 大小的问题..."
      },
      "finish_reason": "stop",
      "index": 0
    }
  ],
  "usage": {
    "prompt_tokens": 25,
    "completion_tokens": 1106,
    "total_tokens": 1131,
    "completion_tokens_details": {
      "reasoning_tokens": 669,
      "text_tokens": 437
    }
  },
  "model": "kimi-k2.6",
  "id": "chatcmpl-xxx"
}
```

---

## 4. 流式调用（逐字输出）

流式调用会逐 chunk 返回生成内容，适合需要实时展示打字机效果的场景（如聊天界面）。

### 4.1 基础流式（非思考模式）

```javascript
const OpenAI = require("openai");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, ".env") });

const client = new OpenAI({
  apiKey: process.env.DASHSCOPE_API_KEY,
  baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
});

async function main() {
  const completion = await client.chat.completions.create({
    model: "kimi-k2.6",
    messages: [{ role: "user", content: "你好，请介绍一下自己" }],
    stream: true, // 开启流式
  });

  let fullContent = "";

  // 使用 for await 遍历流式 chunk
  for await (const chunk of completion) {
    const delta = chunk.choices[0].delta;

    if (delta.content != null) {
      fullContent += delta.content;
      process.stdout.write(delta.content); // 实时输出
    }
  }

  console.log("\n\n完整内容:", fullContent);
}

main();
```

### 4.2 思考模式 + 流式

流式模式下，思考内容和正式回复会交替或分段返回，需要通过 `reasoning_content` 和 `content` 字段区分。

```javascript
async function main() {
  const completion = await client.chat.completions.create({
    model: "kimi-k2.6",
    messages: [{ role: "user", content: "你是谁？" }],
    stream: true,
    enable_thinking: true, // 开启思考模式
  });

  let reasoningContent = "";
  let answerContent = "";
  let isAnswering = false; // 标记是否已进入正式回复阶段

  console.log("\n" + "=".repeat(20) + "思考过程" + "=".repeat(20) + "\n");

  for await (const chunk of completion) {
    const delta = chunk.choices[0].delta;

    // 收集思考内容（reasoning_content）
    if (delta.reasoning_content != null) {
      reasoningContent += delta.reasoning_content;
      process.stdout.write(delta.reasoning_content);
    }

    // 收集正式回复内容（content）
    if (delta.content != null && delta.content !== "") {
      if (!isAnswering) {
        console.log("\n\n" + "=".repeat(20) + "完整回复" + "=".repeat(20) + "\n");
        isAnswering = true;
      }
      answerContent += delta.content;
      process.stdout.write(delta.content);
    }
  }

  console.log("\n\n--- 汇总 ---");
  console.log("思考过程长度:", reasoningContent.length);
  console.log("回复内容长度:", answerContent.length);
}

main();
```

### 4.3 流式 chunk 结构详解

每个 chunk 的 JSON 结构：

```json
{
  "choices": [
    {
      "delta": {
        "content": "你好",        // 正式回复内容（可能为 null）
        "reasoning_content": "用户"  // 思考内容（可能为 null）
      },
      "finish_reason": null,      // 为 "stop" 时表示结束
      "index": 0,
      "logprobs": null
    }
  ],
  "object": "chat.completion.chunk",
  "model": "kimi-k2.6",
  "id": "chatcmpl-xxx",
  "created": 1777061222
}
```

**最后一个 chunk 的特征：**

```json
{
  "choices": [
    {
      "finish_reason": "stop",
      "delta": {
        "content": "",
        "reasoning_content": null
      }
    }
  ]
}
```

> 当 `finish_reason` 为 `"stop"` 时，表示流式输出结束。

---

## 5. 思考模式详解

### 5.1 思考模式 vs 非思考模式

| 特性 | 思考模式 (`enable_thinking: true`) | 非思考模式 (`enable_thinking: false`) |
|------|-----------------------------------|--------------------------------------|
| 响应速度 | 较慢（需要思考时间） | 较快（直接回答） |
| 回答质量 | 更高（经过推理） | 一般（直接生成） |
| 返回字段 | `content` + `reasoning_content` | 仅 `content` |
| Token 计费 | 思考 Token 计入输出 | 仅输出 Token |
| 适用场景 | 复杂问题、数学推理、代码分析 | 简单问答、快速响应 |

### 5.2 思考内容提取（非流式）

```javascript
const msg = response.choices[0].message;

// 思考过程
const reasoning = msg.reasoning_content;

// 正式回复
const answer = msg.content;

// 使用示例
if (reasoning) {
  console.log("思考过程:", reasoning);
}
console.log("最终回答:", answer);
```

### 5.3 思考内容提取（流式）

```javascript
let reasoningContent = "";
let answerContent = "";

for await (const chunk of completion) {
  const delta = chunk.choices[0].delta;

  // 提取思考内容
  if (delta.reasoning_content != null) {
    reasoningContent += delta.reasoning_content;
  }

  // 提取回复内容
  if (delta.content != null && delta.content !== "") {
    answerContent += delta.content;
  }
}

console.log("完整思考:", reasoningContent);
console.log("完整回复:", answerContent);
```

### 5.4 思考 Token 统计

```javascript
const usage = response.usage;
console.log("输入 Token:", usage.prompt_tokens);
console.log("输出 Token:", usage.completion_tokens);
console.log("总 Token:", usage.total_tokens);

// 思考模式下可查看详细拆分
if (usage.completion_tokens_details) {
  console.log("思考 Token:", usage.completion_tokens_details.reasoning_tokens);
  console.log("文本 Token:", usage.completion_tokens_details.text_tokens);
}
```

---

## 6. 多模态输入

Kimi k2.6 / k2.5 支持同时处理文本、图片和视频输入。

### 6.1 图片理解（URL 方式）

支持单图和多图输入，图片通过公网 URL 传入。

```javascript
async function imageUnderstanding() {
  const response = await client.chat.completions.create({
    model: "kimi-k2.6",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: "图中描绘的是什么景象?" },
          {
            type: "image_url",
            image_url: {
              url: "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20241022/emyrja/dog_and_girl.jpeg",
            },
          },
        ],
      },
    ],
    enable_thinking: true, // 可选：开启思考模式
  });

  const msg = response.choices[0].message;

  if (msg.reasoning_content) {
    console.log("思考过程:", msg.reasoning_content);
  }
  console.log("回复:", msg.content);
}

imageUnderstanding();
```

**多图输入示例：**

```javascript
content: [
  { type: "text", text: "这些图描绘了什么内容？" },
  {
    type: "image_url",
    image_url: {
      url: "https://example.com/image1.jpg",
    },
  },
  {
    type: "image_url",
    image_url: {
      url: "https://example.com/image2.jpg",
    },
  },
]
```

### 6.2 图片理解（Base64 方式）

本地图片需要先转为 Base64 Data URL：

```javascript
const fs = require("fs");

function encodeImageToBase64(imagePath) {
  const imageFile = fs.readFileSync(imagePath);
  return imageFile.toString("base64");
}

async function localImageUnderstanding() {
  const base64Image = encodeImageToBase64("./local-image.png");

  const response = await client.chat.completions.create({
    model: "kimi-k2.6",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: "图中描绘的是什么景象?" },
          {
            type: "image_url",
            image_url: {
              url: `data:image/png;base64,${base64Image}`,
            },
          },
        ],
      },
    ],
  });

  console.log(response.choices[0].message.content);
}
```

### 6.3 视频理解（URL 方式）

直接传入视频文件 URL，模型会自动抽帧分析。

```javascript
async function videoUnderstanding() {
  const response = await client.chat.completions.create({
    model: "kimi-k2.6",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "video_url",
            video_url: {
              url: "https://example.com/video.mp4",
            },
            fps: 2, // 抽帧频率：每秒抽 2 帧
          },
          { type: "text", text: "这段视频的内容是什么?" },
        ],
      },
    ],
  });

  console.log(response.choices[0].message.content);
}
```

**视频参数说明：**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `fps` | number | 2.0 | 抽帧频率，范围 [0.1, 10] |
| `max_frames` | number | 2000 | 最大抽帧数上限 |

### 6.4 视频理解（图像列表方式）

如果已经提前抽帧为图片列表，可以按以下方式传入：

```javascript
async function videoFromFrames() {
  const response = await client.chat.completions.create({
    model: "kimi-k2.6",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "video",
            video: [
              "https://example.com/frame1.jpg",
              "https://example.com/frame2.jpg",
              "https://example.com/frame3.jpg",
            ],
            fps: 2,
          },
          { type: "text", text: "描述这个视频的具体过程" },
        ],
      },
    ],
  });

  console.log(response.choices[0].message.content);
}
```

### 6.5 流式多模态

多模态也支持流式输出，与文本流式调用方式相同：

```javascript
async function streamImageUnderstanding() {
  const completion = await client.chat.completions.create({
    model: "kimi-k2.6",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: "描述这张图片" },
          {
            type: "image_url",
            image_url: {
              url: "https://example.com/image.jpg",
            },
          },
        ],
      },
    ],
    stream: true,
    enable_thinking: true,
  });

  for await (const chunk of completion) {
    const delta = chunk.choices[0].delta;
    if (delta.content != null) {
      process.stdout.write(delta.content);
    }
  }
}
```

### 6.6 文件限制

#### 图像限制

| 限制项 | 要求 |
|--------|------|
| 最小尺寸 | 宽度和高度均须大于 10 像素 |
| 宽高比 | 长边与短边比值不得超过 200:1 |
| 分辨率 | 推荐 8K(7680x4320) 以内 |
| 支持格式 | BMP、JPEG、PNG、TIFF、WEBP、HEIC |
| 文件大小 | URL/本地路径传入：单图不超过 10MB；Base64：编码后不超过 10MB |
| 图片数量 | 多张图像时总 Token 数需小于模型最大输入限制 |

#### 视频限制

| 限制项 | 要求 |
|--------|------|
| 文件大小 | URL 传入：不超过 2GB；Base64：编码后小于 10MB；本地路径：不超过 100MB |
| 视频时长 | 2 秒至 1 小时 |
| 支持格式 | MP4、AVI、MKV、MOV、FLV、WMV 等 |
| 视频尺寸 | 建议不超过 2K |
| 音频理解 | 不支持 |

---

## 7. 返回结果结构详解

### 7.1 非流式返回结构

```javascript
{
  "id": "chatcmpl-xxx",           // 请求唯一标识
  "object": "chat.completion",    // 对象类型
  "created": 1777061298,          // 创建时间戳
  "model": "kimi-k2.6",           // 使用的模型
  "choices": [                    // 生成结果列表
    {
      "index": 0,                 // 结果索引
      "message": {                // 消息内容
        "role": "assistant",      // 角色
        "content": "...",         // 正式回复内容
        "reasoning_content": "..." // 思考过程（思考模式下）
      },
      "finish_reason": "stop"     // 结束原因：stop（正常结束）/ length（长度限制）
    }
  ],
  "usage": {                      // Token 用量统计
    "prompt_tokens": 25,          // 输入 Token 数
    "completion_tokens": 1106,    // 输出 Token 数
    "total_tokens": 1131,         // 总 Token 数
    "completion_tokens_details": {
      "reasoning_tokens": 669,    // 思考过程 Token 数
      "text_tokens": 437          // 正式回复 Token 数
    },
    "prompt_tokens_details": {
      "text_tokens": 25,
      "cached_tokens": 0
    }
  }
}
```

### 7.2 流式 chunk 结构

```javascript
{
  "id": "chatcmpl-xxx",
  "object": "chat.completion.chunk",
  "created": 1777061222,
  "model": "kimi-k2.6",
  "choices": [
    {
      "index": 0,
      "delta": {                  // 增量内容
        "content": "...",         // 正式回复增量（可能为 null）
        "reasoning_content": "..." // 思考增量（可能为 null）
      },
      "finish_reason": null,      // 为 "stop" 时表示结束
      "logprobs": null
    }
  ]
}
```

### 7.3 字段提取速查表

| 想要获取 | 非流式 | 流式 |
|---------|--------|------|
| 完整回复 | `response.choices[0].message.content` | 累加 `chunk.choices[0].delta.content` |
| 思考过程 | `response.choices[0].message.reasoning_content` | 累加 `chunk.choices[0].delta.reasoning_content` |
| 是否结束 | `finish_reason === "stop"` | `chunk.choices[0].finish_reason === "stop"` |
| 输入 Token | `response.usage.prompt_tokens` | 流式结束后的最后一个 chunk 或单独统计 |
| 输出 Token | `response.usage.completion_tokens` | 同上 |
| 思考 Token | `response.usage.completion_tokens_details.reasoning_tokens` | 同上 |

---

## 8. 完整代码示例汇总

### 8.1 非流式 + 思考模式（aliai.js）

```javascript
const OpenAI = require("openai");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, ".env") });

const client = new OpenAI({
  apiKey: process.env.DASHSCOPE_API_KEY,
  baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
});

const messages = [
  { role: "system", content: "You are a helpful assistant." },
  { role: "user", content: "你是谁？说说荣耀手机" },
];

async function main() {
  const response = await client.chat.completions.create({
    model: process.env.AI_MODEL_NAME || "qwen-plus",
    messages,
    enable_thinking: true,
  });

  const msg = response.choices[0].message;
  if (msg.reasoning_content) {
    console.log("\n" + "=".repeat(20) + "思考过程" + "=".repeat(20) + "\n");
    console.log(msg.reasoning_content || "");
  }
  console.log("\n" + "=".repeat(20) + "完整回复" + "=".repeat(20) + "\n");
  console.log(msg.content);
}

main();
```

### 8.2 流式 + 思考模式 + 多模态（alikimi.js）

```javascript
const OpenAI = require("openai");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, ".env") });

const openai = new OpenAI({
  apiKey: process.env.DASHSCOPE_API_KEY,
  baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
});

async function main() {
  const completion = await openai.chat.completions.create({
    model: "kimi-k2.6",
    messages: [
      {
        role: "user",
        content: [
          // 图片输入（可选）
          // {
          //   type: "image_url",
          //   image_url: {
          //     url: "https://example.com/image.jpg",
          //   },
          // },
          { type: "text", text: "你是什么" },
        ],
      },
    ],
    stream: true,
    enable_thinking: true,
  });

  let fullContent = "";
  console.log("Stream output content: ");

  for await (const chunk of completion) {
    console.log("\n[原始 JSON chunk]:", JSON.stringify(chunk, null, 2));

    if (chunk.choices[0].delta.content != null) {
      fullContent += chunk.choices[0].delta.content;
      console.log("[内容]", chunk.choices[0].delta.content);
    }
  }

  console.log("\nFull output content:" + fullContent);
}

main();
```

---

## 9. 常见问题

### Q1: 报错 `404 The model does not exist`

检查模型名称是否正确。阿里云百炼支持的 Kimi 模型名：
- `kimi-k2.6`
- `kimi-k2.5`
- `kimi-k2-thinking`
- `Moonshot-Kimi-K2-Instruct`

### Q2: 报错 `ERR_AMBIGUOUS_MODULE_SYNTAX`

`require()` 和顶级 `await` 不能混用。解决方案：
- 使用 `require()` 时，将 `await` 包在 `async function` 中
- 或使用 ES Module（`import` + `"type": "module"`）

### Q3: 思考模式没有返回 `reasoning_content`

- 确认模型支持思考模式（kimi-k2.6 / kimi-k2.5）
- 确认传入了 `enable_thinking: true`
- 部分简单问题模型可能不会输出思考过程

### Q4: 多模态图片无法识别

- 检查图片 URL 是否可公网访问
- 检查图片格式和大小是否符合限制
- 本地图片需使用 Base64 Data URL 方式传入

### Q5: 流式输出如何知道结束了？

监听 `finish_reason` 字段：

```javascript
for await (const chunk of completion) {
  if (chunk.choices[0].finish_reason === "stop") {
    console.log("输出结束");
    break;
  }
}
```

### Q6: 如何传递多轮对话中的思考过程？

kimi-k2.6 支持通过 `preserve_thinking` 参数在多轮对话中传递思考过程，详情请参考阿里云官方文档。

---

> 本文档基于项目实际测试验证，所有代码均可直接运行。如有更新请参考阿里云官方文档：https://help.aliyun.com/zh/model-studio/kimi-api
