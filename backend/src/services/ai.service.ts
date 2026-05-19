import OpenAI from 'openai';
import { env } from '../config/env';
import { AppError } from '../common/errors';

let openaiClient: OpenAI | null = null;

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
  role: 'system' | 'user' | 'assistant';
  content: string | AIContentPart[];
}

export interface AIContentPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string; detail?: 'low' | 'high' | 'auto' };
}

export interface AIChatResult {
  content: string;
  thinkingContent?: string;
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
  done: boolean;
}

interface AIChatOptions {
  model?: string;
  temperature?: number;
  enableThinking?: boolean;
  stream?: boolean;
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
    const client = getOpenAIClient();
    const model = options?.model ?? env.AI_MODEL_NAME;
    const temperature = options?.temperature ?? env.AI_TEMPERATURE;
    const enableThinking = options?.enableThinking ?? env.AI_ENABLE_THINKING;

    try {
      const response = await client.chat.completions.create({
        model,
        messages,
        temperature,
        enable_thinking: enableThinking,
      } as OpenAI.ChatCompletionCreateParamsNonStreaming);

      const msg = response.choices[0].message;
      const usage = response.usage;

      return {
        content: msg.content ?? '',
        thinkingContent: (msg as any).reasoning_content ?? undefined,
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
      const completion = await client.chat.completions.create({
        model,
        messages,
        temperature,
        stream: true,
        enable_thinking: enableThinking,
      } as OpenAI.ChatCompletionCreateParamsStreaming);

      for await (const chunk of completion) {
        if (!chunk.choices || chunk.choices.length === 0) continue;
        const delta = chunk.choices[0].delta;
        const done = chunk.choices[0].finish_reason === 'stop';

        yield {
          content: delta.content ?? '',
          thinkingContent: (delta as any).reasoning_content ?? undefined,
          done,
        };
      }
    } catch (error) {
      throw mapAIError(error);
    }
  },
};