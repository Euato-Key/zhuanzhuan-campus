import { AIClientService } from '../../services/ai.service';
import type { AIChatMessage } from '../../services/ai.service';
import { AIPrompts } from './ai.prompts';
import { SettingsService } from '../settings/settings.service';
import { NotificationService } from '../notification/notification.service';
import { prisma } from '../../config/prisma';
import type { AIAuditResult } from './ai.types';

export const AuditService = {
  async auditProduct(productId: bigint): Promise<AIAuditResult> {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: { select: { name: true } },
      },
    });

    if (!product) {
      throw new Error(`商品不存在: ${productId}`);
    }

    if (product.status !== 'pending') {
      return {
        approved: false,
        riskScore: 0,
        riskCategories: [],
        details: '商品非待审核状态，跳过AI审核',
        suggestions: [],
      };
    }

    const config = await SettingsService.get();
    if (!config.ai_audit_enabled) {
      throw new Error('AI审核功能未启用');
    }

    const conditionLabels: Record<string, string> = {
      new: '全新',
      '99new': '99新(几乎未用)',
      '95new': '95新(轻微使用痕迹)',
      '90new': '90新(明显使用痕迹)',
      '80new': '80新(重度使用)',
    };

    const deliveryLabels: Record<string, string> = {
      self: '仅自提',
      express: '仅快递',
      both: '自提和快递',
    };

    const productInfo = {
      name: product.name,
      description: product.description || undefined,
      categoryName: product.category?.name || '未分类',
      currentPrice: Number(product.currentPrice),
      originalPrice: product.originalPrice ? Number(product.originalPrice) : undefined,
      itemCondition: conditionLabels[product.itemCondition] || product.itemCondition,
      brand: product.brand || undefined,
      tags: (product.tags as string[]) || undefined,
      auditCount: product.auditCount,
      deliveryType: deliveryLabels[product.deliveryType] || product.deliveryType,
      bargain: product.bargain,
    };

    const systemPrompt = AIPrompts.buildAuditSystemPrompt();
    const userMessage = AIPrompts.buildAuditUserPrompt(productInfo);

    const messages: AIChatMessage[] = [
      { role: 'system', content: systemPrompt },
      userMessage,
    ];

    const aiResult = await AIClientService.chatCompletion(messages, {
      enableThinking: false,
      temperature: 0.1,
    });

    let auditResult: AIAuditResult;

    try {
      const jsonMatch = aiResult.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        auditResult = {
          approved: parsed.approved === true || parsed.approved === false ? parsed.approved : true,
          riskScore: typeof parsed.riskScore === 'number' ? parsed.riskScore : 50,
          riskCategories: Array.isArray(parsed.riskCategories) ? parsed.riskCategories : [],
          details: parsed.reason || (parsed.approved ? 'AI审核通过' : 'AI审核不通过，原因未知'),
          suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
        };
      } else {
        auditResult = {
          approved: true,
          riskScore: 50,
          riskCategories: ['解析异常'],
          details: 'AI返回结果解析失败，默认通过',
          suggestions: [],
        };
      }
    } catch (parseError) {
      console.error('[AI Audit] Parse error:', parseError);
      auditResult = {
        approved: true,
        riskScore: 30,
        riskCategories: [],
        details: 'AI审核解析异常，默认通过',
        suggestions: [],
      };
    }

    const newStatus = auditResult.approved ? 'active' : 'audit_failed';

    await prisma.product.update({
      where: { id: productId },
      data: {
        status: newStatus,
        rejectReason: auditResult.approved ? null : auditResult.details,
      },
    });

    if (auditResult.approved) {
      await NotificationService.create({
        userId: product.userId,
        type: 'product',
        title: '商品AI审核通过',
        content: `商品「${product.name}」已通过AI审核，已上架展示。${auditResult.riskScore > 50 ? `（风险评分：${auditResult.riskScore}，请注意规范发布）` : ''}`,
        relatedId: product.id,
        relatedType: 'product',
      });
    } else {
      await NotificationService.create({
        userId: product.userId,
        type: 'product',
        title: '商品AI审核未通过',
        content: `商品「${product.name}」AI审核未通过。原因：${auditResult.details}。当前为第${product.auditCount + 1}次审核，最多可提交3次。`,
        relatedId: product.id,
        relatedType: 'product',
      });
    }

    return auditResult;
  },

  async shouldAudit(scene: 'first_publish' | 'edit'): Promise<boolean> {
    const config = await SettingsService.get();
    if (!config.ai_audit_enabled) return false;

    if (scene === 'first_publish') return config.ai_audit_first_publish;
    if (scene === 'edit') return config.ai_audit_edit;

    return false;
  },
};
