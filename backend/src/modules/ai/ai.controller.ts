import { Request, Response, NextFunction } from 'express';
import { asyncHandler } from '../../common/asyncHandler';
import { ValidationUtil } from '../../common/validation';
import { badRequest } from '../../common/errors';
import { AIService } from './ai.service';
import { success } from '../../utils/response';
import { prisma } from '../../config/prisma';

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

  recognizeProductStream: asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
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

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

    try {
      await AIService.recognition.analyzeStream(
        { images, name, brand },
        (event) => { res.write(`data: ${JSON.stringify(event)}\n\n`); },
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'AI识别失败';
      res.write(`data: ${JSON.stringify({ type: 'error', message })}\n\n`);
    } finally {
      res.write('data: [DONE]\n\n');
      res.end();
    }
  }),

  // AI审核：管理员手动触发
  auditProduct: asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const productId = BigInt(req.params.productId as string);
    const result = await AIService.audit.auditProduct(productId);
    const message = result.skipped ? '商品非待审核状态，已跳过' : (result.approved ? 'AI审核通过' : 'AI审核不通过');
    return success(res, result, message);
  }),

  // 查看商品审核状态
  getAuditStatus: asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const productId = BigInt(req.params.productId as string);

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        status: true,
        rejectReason: true,
        auditCount: true,
        relistCount: true,
        createdAt: true,
        updatedAt: true,
        category: { select: { name: true } },
        user: { select: { id: true, username: true } },
      },
    });

    if (!product) {
      throw badRequest('商品不存在');
    }

    return success(res, product, '获取审核状态成功');
  }),
};
