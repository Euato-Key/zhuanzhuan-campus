import { Request, Response, NextFunction } from 'express';
import { asyncHandler } from '../../common/asyncHandler';
import { ValidationUtil } from '../../common/validation';
import { AuditService } from './audit.service';
import { success } from '../../utils/response';
import { prisma } from '../../config/prisma';

export const AuditController = {
  auditProduct: asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const productId = ValidationUtil.parseBigIntParam(req.params.productId, '商品ID');
    const result = await AuditService.auditProduct(productId);
    const message = result.skipped ? '商品非待审核状态，已跳过' : (result.approved ? 'AI审核通过' : 'AI审核不通过');
    return success(res, result, message);
  }),

  getAuditStatus: asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const productId = ValidationUtil.parseBigIntParam(req.params.productId, '商品ID');

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
      throw new Error('商品不存在');
    }

    return success(res, product, '获取审核状态成功');
  }),
};