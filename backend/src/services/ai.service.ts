import OpenAI from 'openai';
import type { ChatCompletionTool } from 'openai/resources/chat/completions';
import { env } from '../config/env';
import { AppError } from '../common/errors';

let openaiClient: OpenAI | null = null;

interface DashScopeMessage extends OpenAI.ChatCompletionMessage {
  reasoning_content?: string;
  tool_calls?: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }>;
}

interface DashScopeCompletionTokensDetails {
  reasoning_tokens?: number;
  text_tokens?: number;
}

interface DashScopeStreamDelta extends OpenAI.ChatCompletionChunk.Choice.Delta {
  reasoning_content?: string;
  tool_calls?: Array<{ index: number; id?: string; function?: { name?: string; arguments?: string } }>;
}

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: env.DASHSCOPE_API_KEY,
      baseURL: env.AI_BASE_URL,
      timeout: env.AI_TIMEOUT,
      maxRetries: env.AI_MAX_RETRIES,
    });
  }
  return openaiClient;
}

export interface AIChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | AIContentPart[] | null;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
  partial?: boolean;
}

export interface AIContentPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string; detail?: 'low' | 'high' | 'auto' };
}

export interface AIChatResult {
  content: string;
  thinkingContent?: string;
  toolCalls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }>;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    reasoningTokens?: number;
    textTokens?: number;
  };
  model: string;
}

export interface AIStreamChunk {
  content: string;
  thinkingContent?: string;
  toolCalls?: Array<{
    index: number;
    id?: string;
    function?: { name?: string; arguments?: string };
  }>;
  finishReason?: string | null;
  done: boolean;
}

export interface AIChatOptions {
  model?: string;
  temperature?: number;
  enableThinking?: boolean;
  stream?: boolean;
  tools?: ChatCompletionTool[];
  toolChoice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
}

const PARTIAL_SUPPORTED_PATTERNS = [
  'qwen3.7-max', 'qwen3.6-max', 'qwen3-max', 'qwen-max',
  'qwen3.6-plus', 'qwen3.5-plus', 'qwen-plus',
  'qwen3.6-flash', 'qwen3.5-flash', 'qwen-flash', 'qwen-turbo',
  'qwen3-coder', 'qwen2.5-coder', 'qwen-coder',
  'qwen3', 'qwen2.5',
  'deepseek',
  'kimi-k2.6', 'kimi-k2.5',
];

export function supportsPartialMode(modelName: string): boolean {
  const lower = modelName.toLowerCase();
  return PARTIAL_SUPPORTED_PATTERNS.some(m => lower.includes(m));
}

function mapAIError(error: unknown): AppError {
  if (error instanceof OpenAI.APIError) {
    if (error.status === 429) return new AppError('AI服务繁忙，请稍后重试', 429);
    if (error.status === 401) return new AppError('AI服务配置错误', 500);
    if (error.status >= 500) return new AppError('AI服务暂时不可用', 503);
    return new AppError(`AI请求失败: ${error.message}`, error.status);
  }
  if (error instanceof Error && error.name === 'AbortError') {
    return new AppError('AI识别超时，请稍后重试', 503);
  }
  return new AppError('AI服务异常', 500);
}

export const AIClientService = {
  async chatCompletion(messages: AIChatMessage[], options?: AIChatOptions): Promise<AIChatResult> {
    const model = options?.model ?? env.AI_MODEL_NAME;
    const temperature = options?.temperature ?? env.AI_TEMPERATURE;
    const enableThinking = options?.enableThinking ?? env.AI_ENABLE_THINKING;

    const params: Record<string, any> = {
      model,
      messages,
      temperature,
      enable_thinking: enableThinking,
    };
    if (options?.tools?.length) {
      params.tools = options.tools;
      if (options.toolChoice) params.tool_choice = options.toolChoice;
    }

    // If any message has partial:true, use raw fetch — the OpenAI SDK strips
    // the 'partial' field during validation, which breaks DashScope's prefix
    // continuation mode. Raw fetch preserves the field.
    const hasPartial = messages.some(m => m.partial === true);
    if (hasPartial) {
      return chatCompletionRaw(params);
    }

    try {
      const client = getOpenAIClient();
      const response = await client.chat.completions.create(
        params as OpenAI.ChatCompletionCreateParamsNonStreaming,
      );

      const msg = response.choices[0].message;
      const usage = response.usage;

      return {
        content: msg.content ?? '',
        thinkingContent: (msg as DashScopeMessage).reasoning_content ?? undefined,
        toolCalls: (msg as DashScopeMessage).tool_calls ?? undefined,
        usage: {
          promptTokens: usage?.prompt_tokens ?? 0,
          completionTokens: usage?.completion_tokens ?? 0,
          totalTokens: usage?.total_tokens ?? 0,
          reasoningTokens: (usage?.completion_tokens_details as any)?.reasoning_tokens ?? undefined,
          textTokens: (usage?.completion_tokens_details as any)?.text_tokens ?? undefined,
        },
        model: response.model,
      };
    } catch (error) {
      throw mapAIError(error);
    }
  },

  async *streamChatCompletion(messages: AIChatMessage[], options?: AIChatOptions): AsyncGenerator<AIStreamChunk> {
    const client = getOpenAIClient();
    const model = options?.model ?? env.AI_MODEL_NAME;
    const temperature = options?.temperature ?? env.AI_TEMPERATURE;
    const enableThinking = options?.enableThinking ?? env.AI_ENABLE_THINKING;

    try {
      const params: Record<string, any> = {
        model,
        messages,
        temperature,
        stream: true,
        enable_thinking: enableThinking,
      };
      if (options?.tools?.length) {
        params.tools = options.tools;
        if (options.toolChoice) params.tool_choice = options.toolChoice;
      }

      const completion = await client.chat.completions.create(
        params as OpenAI.ChatCompletionCreateParamsStreaming,
      );

      for await (const chunk of completion) {
        if (!chunk.choices || chunk.choices.length === 0) continue;
        const choice = chunk.choices[0];
        const delta = choice.delta;
        const finishReason = choice.finish_reason;

        yield {
          content: delta.content ?? '',
          thinkingContent: (delta as any).reasoning_content ?? undefined,
          toolCalls: (delta as any).tool_calls ?? undefined,
          finishReason: finishReason ?? null,
          done: finishReason === 'stop' || finishReason === 'tool_calls' || finishReason === 'length',
        };
      }
    } catch (error) {
      throw mapAIError(error);
    }
  },
};

async function chatCompletionRaw(params: Record<string, any>): Promise<AIChatResult> {
  const url = `${env.AI_BASE_URL}/chat/completions`;
  const body = JSON.stringify(params);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), env.AI_TIMEOUT);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.DASHSCOPE_API_KEY}`,
      },
      body,
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new AppError(`AI请求失败: ${res.status} ${text}`, res.status as any);
    }

    const data = await res.json() as any;
    const msg = data.choices?.[0]?.message;
    const usage = data.usage;

    return {
      content: msg?.content ?? '',
      thinkingContent: msg?.reasoning_content ?? undefined,
      toolCalls: msg?.tool_calls ?? undefined,
      usage: {
        promptTokens: usage?.prompt_tokens ?? 0,
        completionTokens: usage?.completion_tokens ?? 0,
        totalTokens: usage?.total_tokens ?? 0,
        reasoningTokens: usage?.completion_tokens_details?.reasoning_tokens ?? undefined,
        textTokens: usage?.completion_tokens_details?.text_tokens ?? undefined,
      },
      model: data.model ?? params.model,
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new AppError('AI识别超时，请稍后重试', 503);
    }
    throw mapAIError(error);
  } finally {
    clearTimeout(timer);
  }
}