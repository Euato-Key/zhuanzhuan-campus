import { Request, Response, NextFunction } from 'express';
import { SettingsService } from './settings.service';
import { success } from '../../utils/response';
import { badRequest } from '../../common/errors';
import { asyncHandler } from '../../common/asyncHandler';

export const SettingsController = {
  getSettings: asyncHandler(async (_req: Request, res: Response, _next: NextFunction) => {
    const settings = await SettingsService.get();
    success(res, settings, '获取配置成功');
  }),

  updateSettings: asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const body = req.body;

    const validKeys = [
      'ai_audit_enabled',
      'ai_audit_first_publish',
      'ai_audit_edit',
      'ai_publish_enabled',
      'ai_context_window',
    ];

    const filtered: Record<string, unknown> = {};
    const invalidKeys: string[] = [];

    for (const key of Object.keys(body)) {
      if (validKeys.includes(key)) {
        filtered[key] = body[key];
      } else {
        invalidKeys.push(key);
      }
    }

    if (invalidKeys.length > 0) {
      throw badRequest(`无效的配置项: ${invalidKeys.join(', ')}`);
    }

    if (Object.keys(filtered).length === 0) {
      throw badRequest('没有有效的配置项');
    }

    // 验证类型
    if ('ai_audit_enabled' in filtered && typeof filtered.ai_audit_enabled !== 'boolean') {
      throw badRequest('ai_audit_enabled 必须是布尔值');
    }
    if ('ai_audit_first_publish' in filtered && typeof filtered.ai_audit_first_publish !== 'boolean') {
      throw badRequest('ai_audit_first_publish 必须是布尔值');
    }
    if ('ai_audit_edit' in filtered && typeof filtered.ai_audit_edit !== 'boolean') {
      throw badRequest('ai_audit_edit 必须是布尔值');
    }
    if ('ai_publish_enabled' in filtered && typeof filtered.ai_publish_enabled !== 'boolean') {
      throw badRequest('ai_publish_enabled 必须是布尔值');
    }
    if ('ai_context_window' in filtered) {
      const val = filtered.ai_context_window;
      if (typeof val !== 'number' || val < 3 || val > 20) {
        throw badRequest('ai_context_window 必须是 3-20 之间的数字');
      }
    }

    const settings = await SettingsService.setAll(filtered as any);
    success(res, settings, '配置更新成功');
  }),
};
