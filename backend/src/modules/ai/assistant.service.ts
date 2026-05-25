import { AIClientService } from '../../services/ai.service';
import type { AIChatMessage } from '../../services/ai.service';
import { supportsPartialMode } from '../../services/ai.service';
import { env } from '../../config/env';
import { ConversationService } from './conversation.service';
import { CategoryService } from '../category/category.service';
import { AIPrompts } from './ai.prompts';
import { SettingsService } from '../settings/settings.service';
import { ASSISTANT_TOOLS, executeAssistantTool, getToolStatusMessage } from './assistant-tools';
import type { AssistantStreamEvent, ProductCardItem, OrderCardItem } from './ai.types';
import { prisma } from '../../config/prisma';

const MAX_TOOL_ROUNDS = 3;

const TOOL_TAG_NAMES = [
  'search_products', 'get_my_orders', 'get_my_stats', 'get_platform_stats',
  'product_card', 'order_card', 'show_product_card', 'show_order_card', 'text', 'hamster',
];

function cleanAIOutput(text: string): string {
  return text
    .replace(/<\/?text>/g, '')
    .replace(/<hamster>[\s\S]*?<\/hamster>/g, '')
    .replace(/<search_products[^>]*>[\s\S]*?<\/search_products>/g, '')
    .replace(/<get_my_orders[^>]*>[\s\S]*?<\/get_my_orders>/g, '')
    .replace(/<get_my_stats[^>]*>[\s\S]*?<\/get_my_stats>/g, '')
    .replace(/<get_platform_stats[^>]*>[\s\S]*?<\/get_platform_stats>/g, '')
    .replace(/<(?:show_)?product_card[^>]*>[\s\S]*?<\/(?:show_)?product_card>/g, '')
    .replace(/<(?:show_)?order_card[^>]*>[\s\S]*?<\/(?:show_)?order_card>/g, '')
    .replace(/<(?:show_)?product_card[^>]*>/g, '')
    .replace(/<(?:show_)?order_card[^>]*>/g, '')
    .trim();
}

interface ParsedToolCall {
  name: string;
  args: Record<string, any>;
}

function parseXMLToolCalls(text: string): ParsedToolCall[] {
  const calls: ParsedToolCall[] = [];
  let match: RegExpExecArray | null;

  const searchRegex = /<search_products\s+keyword="([^"]*)"(?:\s+categoryId="([^"]*)")?\s*\/?>/g;
  while ((match = searchRegex.exec(text)) !== null) {
    const args: Record<string, any> = { keyword: match[1] };
    if (match[2]) args.categoryId = Number(match[2]);
    calls.push({ name: 'search_products', args });
  }

  if (/<get_my_orders[\s/]*>/i.test(text)) {
    calls.push({ name: 'get_my_orders', args: {} });
  }
  if (/<get_my_stats[\s/]*>/i.test(text)) {
    calls.push({ name: 'get_my_stats', args: {} });
  }
  if (/<get_platform_stats[\s/]*>/i.test(text)) {
    calls.push({ name: 'get_platform_stats', args: {} });
  }

  const productCardRegex = /<(?:show_)?product_card\s+(?:ids="([^"]*)"|order_ids="([^"]*)"|product_ids="([^"]*)"|(\d[\d,]*))\s*\/?>/g;
  while ((match = productCardRegex.exec(text)) !== null) {
    const ids = match[1] || match[2] || match[3] || match[4];
    calls.push({ name: 'show_product_card', args: { product_ids: ids } });
  }

  const orderCardRegex = /<(?:show_)?order_card\s+(?:ids="([^"]*)"|order_ids="([^"]*)"|(\d[\d,]*))\s*\/?>/g;
  while ((match = orderCardRegex.exec(text)) !== null) {
    const ids = match[1] || match[2] || match[3];
    calls.push({ name: 'show_order_card', args: { order_ids: ids } });
  }

  return calls;
}

function stripToolTags(text: string): string {
  let out = text;
  for (const tag of TOOL_TAG_NAMES) {
    out = out.replace(new RegExp(`<${tag}[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi'), '');
    out = out.replace(new RegExp(`<${tag}[^>]*/?>`, 'gi'), '');
  }
  out = out.replace(/<\/?text>/gi, '');
  return out.trim();
}

// Yield text in SSE-compatible chunks, splitting into small pieces
// so the frontend can show progressive rendering.
function *splitToTokens(text: string, chunkSize = 4): Generator<AssistantStreamEvent> {
  if (!text) return;
  for (let i = 0; i < text.length; i += chunkSize) {
    yield { type: 'token', content: text.slice(i, i + chunkSize) };
  }
}

export const AssistantService = {
  async *chatStream(userId: number, conversationId: number, message: string): AsyncGenerator<AssistantStreamEvent> {
    const sanitized = message.slice(0, 500).trim();
    if (!sanitized) { yield { type: 'error', message: '消息不能为空' }; return; }

    await ConversationService.saveMessage(conversationId, 'user', sanitized);
    await prisma.aIConversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });

    const config = await SettingsService.get();
    const contextWindow = config.ai_context_window || 5;

    const [categories, user, platformStats] = await Promise.all([
      CategoryService.getFlatList(),
      prisma.user.findUnique({ where: { id: userId }, select: { id: true, username: true, creditScore: true } }),
      prisma.$transaction([
        prisma.user.count(),
        prisma.product.count({ where: { status: 'active' } }),
        prisma.order.count(),
      ]),
    ]);

    const categoryList = categories.map((c: any) => c.name).join('、');
    const platform = { productCount: platformStats[1], userCount: platformStats[0], orderCount: platformStats[2] };

    const systemPrompt = AIPrompts.buildAssistantSystemPrompt({
      categoryList,
      userName: user?.username || '同学',
      platformStats: platform,
    });

    const recentMessages = await ConversationService.getRecentMessages(conversationId, contextWindow);
    const contextMessages = recentMessages.reverse();

    const baseMessages: AIChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...contextMessages.map(m => ({ role: m.role as 'user' | 'assistant' | 'system', content: m.content })),
    ];

    // Try tool-calling mode first, fallback to XML parsing
    try {
      yield* chatWithToolCalling(baseMessages, conversationId, userId);
    } catch (err: any) {
      const msg = err?.message ?? '';
      const status = err?.status ?? err?.statusCode ?? 0;
      if (
        msg.includes('tool') || msg.includes('function') ||
        msg.includes('not supported') || msg.includes('unsupported') ||
        msg.includes('stream') ||
        status === 400 || status === 422
      ) {
        yield* chatWithXMLParsing(baseMessages, conversationId, userId);
      } else {
        throw err;
      }
    }
  },
};

async function *chatWithToolCalling(
  messages: AIChatMessage[],
  conversationId: number,
  userId: number,
): AsyncGenerator<AssistantStreamEvent> {
  const mutableMessages = [...messages];
  let assistantContent = '';
  const collectedCards: Array<{ type: string; data: ProductCardItem[] | OrderCardItem[] }> = [];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const result = await AIClientService.chatCompletion(mutableMessages, {
      enableThinking: false,
      temperature: 0.6,
      tools: ASSISTANT_TOOLS,
      toolChoice: 'auto',
    });

    const displayText = stripToolTags(result.content);
    if (displayText) yield* splitToTokens(displayText);

    const validToolCalls = result.toolCalls?.filter(tc => tc.id && tc.function.name) ?? [];

    if (validToolCalls.length === 0) {
      assistantContent += result.content;
      break;
    }

    assistantContent += result.content;

    mutableMessages.push({
      role: 'assistant',
      content: result.content || null,
      tool_calls: validToolCalls.map(tc => ({
        id: tc.id,
        type: 'function' as const,
        function: { name: tc.function.name, arguments: tc.function.arguments },
      })),
    });

    for (const tc of validToolCalls) {
      yield { type: 'status', phase: tc.function.name, message: getToolStatusMessage(tc.function.name) };

      const execResult = await executeAssistantTool(
        { id: tc.id, function: { name: tc.function.name, arguments: tc.function.arguments } },
        userId,
      );

      mutableMessages.push({
        role: 'tool',
        content: JSON.stringify(execResult.result),
        tool_call_id: tc.id,
      });

      if (execResult.displayType && execResult.displayData) {
        yield { type: 'card', msg_type: execResult.displayType, data: execResult.displayData, content: '' };
        collectedCards.push({ type: execResult.displayType, data: execResult.displayData });
      }
    }
  }

  // Final response without tools
  const finalResult = await AIClientService.chatCompletion(mutableMessages, {
    enableThinking: false,
    temperature: 0.6,
  });

  const finalText = stripToolTags(finalResult.content);
  if (finalText) yield* splitToTokens(finalText);

  assistantContent += finalResult.content;
  const cleaned = cleanAIOutput(assistantContent);

  // Save as a single message with cards in extraData
  const extraData = collectedCards.length > 0 ? { cards: collectedCards } : undefined;
  const savedMsg = await ConversationService.saveMessage(conversationId, 'assistant', cleaned || ' ', collectedCards.length > 0 ? 'mixed' : 'text', extraData);

  yield { type: 'done', conversationId, messageId: savedMsg.id };
}

async function *chatWithXMLParsing(
  messages: AIChatMessage[],
  conversationId: number,
  userId: number,
): AsyncGenerator<AssistantStreamEvent> {
  const mutableMessages = [...messages];
  let assistantContent = '';
  const collectedCards: Array<{ type: string; data: ProductCardItem[] | OrderCardItem[] }> = [];
  const usePartial = supportsPartialMode(env.AI_MODEL_NAME);
  let usedPartial = false;

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const result = await AIClientService.chatCompletion(mutableMessages, {
      enableThinking: false,
      temperature: 0.6,
    });

    const fullContent = result.content || '';
    const displayText = stripToolTags(fullContent);
    if (displayText) yield* splitToTokens(displayText);

    assistantContent += fullContent;
    const toolCalls = parseXMLToolCalls(fullContent);

    if (toolCalls.length === 0) {
      // In partial mode, the model already produced continuation text —
      // no need for a separate final response (which would duplicate it)
      if (usePartial && usedPartial) break;
      // First round with no tools — need final response
      if (round === 0) break;
      // Subsequent round after partial continuation — done
      break;
    }

    for (const tc of toolCalls) {
      yield { type: 'status', phase: tc.name, message: getToolStatusMessage(tc.name) };

      const argsJson = JSON.stringify(tc.args);
      const execResult = await executeAssistantTool(
        { id: `xml_${tc.name}_${Date.now()}`, function: { name: tc.name, arguments: argsJson } },
        userId,
      );

      if (execResult.displayType && execResult.displayData) {
        yield { type: 'card', msg_type: execResult.displayType, data: execResult.displayData, content: '' };
        collectedCards.push({ type: execResult.displayType, data: execResult.displayData });
      }

      const resultSummary = execResult.displayType === 'product_card'
        ? `（已展示商品卡片，请用简短文字推荐这些商品）`
        : execResult.displayType === 'order_card'
        ? `（已展示订单卡片，请用简短文字说明这些订单）`
        : '';

      if (usePartial) {
        // Partial mode: append tool result into the assistant prefix so model continues from it
        // The partial assistant message must be the LAST message — no user message after it
        mutableMessages.push({
          role: 'assistant',
          content: fullContent + `\n[工具调用结果: ${tc.name}]\n${JSON.stringify(execResult.result)}\n${resultSummary}\n`,
          partial: true,
        });
        usedPartial = true;
      } else {
        mutableMessages.push({ role: 'assistant', content: fullContent });
        mutableMessages.push({
          role: 'user',
          content: `[工具调用结果: ${tc.name}]\n${JSON.stringify(execResult.result)}\n${resultSummary}\n请基于以上结果回复用户，纯文本回复即可，不要再用任何标签。`,
        });
      }
    }
  }

  // Final response only needed when not using partial mode, or when first round had no tools
  if (!usedPartial) {
    const finalResult = await AIClientService.chatCompletion(mutableMessages, {
      enableThinking: false,
      temperature: 0.6,
    });

    const finalText = stripToolTags(finalResult.content);
    if (finalText) yield* splitToTokens(finalText);

    assistantContent += finalResult.content;
  }

  const cleaned = cleanAIOutput(assistantContent);

  const extraData = collectedCards.length > 0 ? { cards: collectedCards } : undefined;
  const savedMsg = await ConversationService.saveMessage(conversationId, 'assistant', cleaned || ' ', collectedCards.length > 0 ? 'mixed' : 'text', extraData);

  yield { type: 'done', conversationId, messageId: savedMsg.id };
}