import { Request, Response } from 'express';
import { success, fail } from '../../utils/response';
import { uploadService } from './upload.service';
import { asyncHandler } from '../../common/asyncHandler';
import { ValidationUtil } from '../../common/validation';

export const UploadController = {
  getSTSToken: asyncHandler(async (req: Request, res: Response) => {
    const { type } = req.body;
    if (!type) return fail(res, '上传类型不能为空');
    const userId = ValidationUtil.requireUserId(req);
    const result = await uploadService.getSTSToken(type, userId);
    return success(res, result, '获取STS凭证成功');
  }),

  getSignedUrl: asyncHandler(async (req: Request, res: Response) => {
    const { type, filename } = req.body;
    if (!type) return fail(res, '上传类型不能为空');
    if (!filename) return fail(res, '文件名不能为空');
    const userId = ValidationUtil.requireUserId(req);
    const result = await uploadService.getSignedUploadUrl(type, userId, filename);
    return success(res, result, '获取签名URL成功');
  }),
};