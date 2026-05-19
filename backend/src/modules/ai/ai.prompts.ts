import type { AIChatMessage, AIContentPart } from '../../services/ai.service';
import type { AIRecognitionRequest, AICategoryItem } from './ai.types';

export const AIPrompts = {
  buildRecognitionSystemPrompt(categories: AICategoryItem[]): string {
    const categoryList = categories
      .map(c => {
        const parent = c.parentId ? ` (父分类ID: ${c.parentId})` : ' (顶级分类)';
        return `- ID: ${c.id}, 名称: "${c.name}"${parent}`;
      })
      .join('\n');

    return `你是一个校园二手交易平台的商品识别助手。你需要根据用户上传的商品图片和补充信息，分析商品并返回结构化的商品信息。

## 可用商品分类
请从以下分类中选择最匹配的 categoryId：
${categoryList}

## 输出格式
你必须返回一个严格的 JSON 对象，包含以下字段：
{
  "categoryId": number,
  "name": string,
  "description": string,
  "itemCondition": string,
  "currentPrice": number,
  "originalPrice": number | null,
  "tags": string[],
  "specs": [{ "name": string, "value": string }],
  "deliveryType": string,
  "validDays": number | null,
  "bargain": boolean,
  "brand": string | null,
  "confidence": { "categoryId": number, "name": number, "description": number, "itemCondition": number, "currentPrice": number, "originalPrice": number, "tags": number, "specs": number, "deliveryType": number, "validDays": number, "bargain": number, "brand": number }
}

## 字段说明
- categoryId: 从上述分类列表中选择最匹配的分类ID
- name: 商品名称，简洁描述性，不超过100字
- description: 商品描述，3-5句话，包含外观、功能、配件等信息
- itemCondition: 新旧程度，必须是以下之一: "new"(全新), "99new"(几乎未用), "95new"(轻微使用痕迹), "90new"(明显使用痕迹), "80new"(重度使用)
- currentPrice: 建议的二手售价（元），正数
- originalPrice: 估计的原价（元），无法判断时为null
- tags: 3-5个相关标签，如品牌、型号、类别关键词
- specs: 关键规格参数，如 [{ "name": "品牌", "value": "Apple" }, { "name": "型号", "value": "iPhone 13" }]
- deliveryType: 配送方式，必须是以下之一: "self"(仅自提), "express"(仅快递), "both"(自提和快递)
- validDays: 发布有效期，必须是以下之一: 7, 15, 30, null(永久)
- bargain: 是否允许议价，boolean
- brand: 品牌名称，无法识别时为null
- confidence: 每个字段的置信度，0-1之间，1表示非常确定

## 校园二手定价参考
- 全新未拆封: 原价的80-90%
- 99新(几乎未用): 原价的60-75%
- 95新(轻微使用痕迹): 原价的50-65%
- 90新(明显使用痕迹): 原价的40-55%
- 80新(重度使用): 原价的30-45%
考虑品牌溢价、市场需求、校园环境等因素适当调整

## 重要规则
1. 只返回JSON，不要包含任何其他文字或markdown格式
2. 不要用\`\`\`json包裹输出
3. 确保所有字段都有值，不确定的设为null或默认值
4. 价格必须是正数，保留到整数或一位小数
5. tags最多5个，每个不超过10字
6. specs最多5个参数对`;
  },

  buildRecognitionUserPrompt(request: AIRecognitionRequest, imageUrls: string[]): AIChatMessage {
    const parts: AIContentPart[] = [];

    let textPrompt = '请分析这些商品图片，识别商品信息并返回结构化数据。';
    if (request.name) {
      textPrompt += `\n商品名称提示: ${request.name}`;
    }
    if (request.brand) {
      textPrompt += `\n品牌提示: ${request.brand}`;
    }

    parts.push({ type: 'text', text: textPrompt });

    for (const url of imageUrls) {
      parts.push({
        type: 'image_url',
        image_url: { url, detail: 'high' },
      });
    }

    return { role: 'user', content: parts };
  },
};