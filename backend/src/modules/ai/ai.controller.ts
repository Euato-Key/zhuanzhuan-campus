import { Request, Response, NextFunction } from 'express';
import { asyncHandler } from '../../common/asyncHandler';
import { ValidationUtil } from '../../common/validation';
import { badRequest } from '../../common/errors';
import { AIService } from './ai.service';
import { success } from '../../utils/response';

export const AIController = {
  recognizeProduct: asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const userId = ValidationUtil.requireUserId(req);
    const { images, name, brand } = req.body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      throw badRequest('至少上传一张商品图片');
    }
    if (images.length > 9) {
      throw badRequest('商品图片最多9张');
    }
    for (const img of images) {
      if (typeof img !== 'string' || !img.startsWith('products/')) {
        throw badRequest('图片路径格式不正确');
      }
    }
    if (name !== undefined && typeof name !== 'string') {
      throw badRequest('商品名称必须为字符串');
    }
    if (brand !== undefined && typeof brand !== 'string') {
      throw badRequest('品牌必须为字符串');
    }

    const result = await AIService.recognition.analyze(userId, { images, name, brand });
    return success(res, result, 'AI识别完成');
  }),
};