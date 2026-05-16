import { Request, Response } from 'express';
import { success, fail } from '../../utils/response';
import { UploadService } from './upload.service';
import { asyncHandler } from '../../common/asyncHandler';
import { ValidationUtil } from '../../common/validation';
import { badRequest } from '../../common/errors';

const VALID_UPLOAD_TYPES = ['avatar', 'product', 'community', 'chat'] as const;
type UploadType = typeof VALID_UPLOAD_TYPES[number];

function validateUploadType(type: string): UploadType {
  if (!VALID_UPLOAD_TYPES.includes(type as UploadType)) {
    throw badRequest('无效的上传类型');
  }
  return type as UploadType;
}

export const UploadController = {
  getSTSToken: asyncHandler(async (req: Request, res: Response) => {
    const { type } = req.body;
    if (!type) return fail(res, '上传类型不能为空');
    const validType = validateUploadType(type);
    const userId = ValidationUtil.requireUserId(req);
    const result = await UploadService.getSTSToken(validType, userId);
    return success(res, result, '获取STS凭证成功');
  }),

  getSignedUrl: asyncHandler(async (req: Request, res: Response) => {
    const { type, filename } = req.body;
    if (!type) return fail(res, '上传类型不能为空');
    if (!filename) return fail(res, '文件名不能为空');
    const validType = validateUploadType(type);
    const userId = ValidationUtil.requireUserId(req);
    const result = await UploadService.getSignedUploadUrl(validType, userId, filename);
    return success(res, result, '获取签名URL成功');
  }),
};