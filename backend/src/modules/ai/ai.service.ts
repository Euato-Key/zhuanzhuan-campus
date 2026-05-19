import { AIClientService } from '../../services/ai.service';
import type { AIChatMessage } from '../../services/ai.service';
import { CategoryService } from '../category/category.service';
import { FileService } from '../../services/file.service';
import { AIPrompts } from './ai.prompts';
import type {
  AIRecognitionRequest,
  AIRecognitionResult,
  AIRecognitionRawOutput,
  AICategoryItem,
  AIAuditResult,
  AIAssistantContext,
} from './ai.types';
import {
  VALID_ITEM_CONDITIONS,
  VALID_DELIVERY_TYPES,
  VALID_VALID_DAYS,
} from './ai.types';
import { badRequest } from '../../common/errors';

function extractJSON(text: string): string {
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) return codeBlockMatch[1].trim();

  const braceMatch = text.match(/\{[\s\S]*\}/);
  if (braceMatch) return braceMatch[0];

  return text;
}

function parseAIResponse(rawContent: string): { data: AIRecognitionRawOutput; confidence: Record<string, number> } | null {
  try {
    const jsonStr = extractJSON(rawContent);
    const parsed = JSON.parse(jsonStr);

    return {
      data: {
        categoryId: parsed.categoryId,
        name: parsed.name,
        description: parsed.description,
        itemCondition: parsed.itemCondition,
        currentPrice: parsed.currentPrice,
        originalPrice: parsed.originalPrice,
        tags: parsed.tags,
        specs: parsed.specs,
        deliveryType: parsed.deliveryType,
        validDays: parsed.validDays,
        bargain: parsed.bargain,
        brand: parsed.brand,
      },
      confidence: parsed.confidence ?? {},
    };
  } catch {
    return null;
  }
}

function normalizeRecognitionResult(
  raw: AIRecognitionRawOutput,
  rawConfidence: Record<string, number>,
  categories: AICategoryItem[],
  request: AIRecognitionRequest,
): { data: AIRecognitionResult['data']; confidence: Record<string, number>; warnings: string[] } {
  const warnings: string[] = [];
  const confidence = { ...rawConfidence };
  const data: AIRecognitionResult['data'] = {};

  // categoryId
  if (raw.categoryId != null) {
    const found = categories.find(c => c.id === raw.categoryId);
    if (found) {
      data.categoryId = raw.categoryId;
    } else {
      const nameMatch = categories.find(c =>
        raw.name && c.name.toLowerCase().includes(raw.name.toLowerCase().split(/\s/)[0])
      );
      if (nameMatch) {
        data.categoryId = nameMatch.id;
        warnings.push(`AI返回的分类ID ${raw.categoryId} 不存在，已按名称匹配到"${nameMatch.name}"`);
      } else {
        warnings.push(`AI返回的分类ID ${raw.categoryId} 不存在，请手动选择分类`);
      }
    }
  }

  // name
  if (raw.name && typeof raw.name === 'string') {
    data.name = raw.name.slice(0, 100);
  } else if (request.name) {
    data.name = request.name.slice(0, 100);
  }

  // description
  if (raw.description && typeof raw.description === 'string') {
    data.description = raw.description;
  }

  // itemCondition
  if (raw.itemCondition && VALID_ITEM_CONDITIONS.includes(raw.itemCondition as any)) {
    data.itemCondition = raw.itemCondition;
  } else if (raw.itemCondition) {
    const conditionAliases: Record<string, string> = {
      '全新': 'new', '未使用': 'new', 'brand new': 'new',
      '几乎全新': '99new', '99成新': '99new',
      '轻微使用': '95new', '95成新': '95new',
      '明显使用': '90new', '9成新': '90new',
      '重度使用': '80new', '8成新': '80new',
    };
    const mapped = conditionAliases[raw.itemCondition] ?? conditionAliases[raw.itemCondition.toLowerCase()];
    if (mapped) {
      data.itemCondition = mapped;
      warnings.push(`新旧程度"${raw.itemCondition}"已映射为"${mapped}"`);
    } else {
      warnings.push(`AI返回的新旧程度"${raw.itemCondition}"无效，请手动选择`);
    }
  }

  // currentPrice
  if (raw.currentPrice != null && typeof raw.currentPrice === 'number' && raw.currentPrice > 0) {
    data.currentPrice = Math.round(raw.currentPrice * 100) / 100;
  } else if (raw.currentPrice != null) {
    warnings.push('AI返回的售价无效，请手动填写');
  }

  // originalPrice
  if (raw.originalPrice != null && typeof raw.originalPrice === 'number' && raw.originalPrice > 0) {
    data.originalPrice = Math.round(raw.originalPrice * 100) / 100;
  }

  // tags
  if (Array.isArray(raw.tags)) {
    data.tags = raw.tags
      .filter((t): t is string => typeof t === 'string')
      .map(t => t.slice(0, 10))
      .slice(0, 5);
  }

  // specs
  if (Array.isArray(raw.specs)) {
    data.specs = raw.specs
      .filter((s): s is { name: string; value: string } =>
        typeof s === 'object' && s != null && typeof s.name === 'string' && typeof s.value === 'string'
      )
      .slice(0, 5);
  }

  // deliveryType
  if (raw.deliveryType && VALID_DELIVERY_TYPES.includes(raw.deliveryType as any)) {
    data.deliveryType = raw.deliveryType as 'self' | 'express' | 'both';
  } else {
    data.deliveryType = 'both';
    if (raw.deliveryType) {
      warnings.push(`配送方式"${raw.deliveryType}"无效，已默认为"both"`);
    }
  }

  // validDays
  if (raw.validDays == null || VALID_VALID_DAYS.includes(raw.validDays as any)) {
    data.validDays = raw.validDays as 7 | 15 | 30 | null;
  } else if (typeof raw.validDays === 'number') {
    const closest = [7, 15, 30].reduce((prev, curr) =>
      Math.abs(curr - raw.validDays!) < Math.abs(prev - raw.validDays!) ? curr : prev
    );
    data.validDays = closest;
    warnings.push(`有效期${raw.validDays}天无效，已调整为${closest}天`);
  }

  // bargain
  if (typeof raw.bargain === 'boolean') {
    data.bargain = raw.bargain;
  }

  // brand
  if (raw.brand && typeof raw.brand === 'string') {
    data.brand = raw.brand;
  } else if (request.brand) {
    data.brand = request.brand;
  }

  return { data, confidence, warnings };
}

export const AIService = {
  recognition: {
    async analyze(userId: number, request: AIRecognitionRequest): Promise<AIRecognitionResult> {
      if (!request.images || request.images.length === 0) {
        throw badRequest('至少上传一张商品图片');
      }
      if (request.images.length > 9) {
        throw badRequest('商品图片最多9张');
      }

      const categories = await CategoryService.getFlatList();
      const aiCategories: AICategoryItem[] = categories.map(c => ({
        id: c.id,
        name: c.name,
        parentId: c.parentId,
      }));

      const imageUrls = request.images.map(path => {
        try {
          return FileService.getSignedReadUrl(path);
        } catch {
          throw badRequest(`图片路径无效: ${path}`);
        }
      });

      const systemPrompt = AIPrompts.buildRecognitionSystemPrompt(aiCategories);
      const userMessage = AIPrompts.buildRecognitionUserPrompt(request, imageUrls);

      const messages: AIChatMessage[] = [
        { role: 'system', content: systemPrompt },
        userMessage,
      ];

      const aiResult = await AIClientService.chatCompletion(messages, {
        enableThinking: true,
      });

      const parsed = parseAIResponse(aiResult.content);
      if (!parsed) {
        return {
          data: {},
          confidence: {},
          warnings: ['AI返回结果解析失败，请手动填写商品信息'],
          rawResponse: aiResult.content,
        };
      }

      const { data, confidence, warnings } = normalizeRecognitionResult(
        parsed.data,
        parsed.confidence,
        aiCategories,
        request,
      );

      return {
        data,
        confidence,
        warnings,
        rawResponse: aiResult.content,
      };
    },
  },

  audit: {
    async auditProduct(_productId: bigint): Promise<AIAuditResult> {
      throw new Error('AI审核功能尚未实现');
    },
  },

  assistant: {
    async *chatStream(_userId: number, _message: string, _context?: AIAssistantContext): AsyncGenerator<string> {
      throw new Error('AI助手功能尚未实现');
    },
  },
};