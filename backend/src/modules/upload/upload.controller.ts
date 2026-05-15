import { Request, Response } from 'express';
import { success, fail } from '../../utils/response';
import { uploadService } from './upload.service';

export const UploadController = {
  async getSTSToken(req: Request, res: Response) {
    try {
      const { type } = req.body;
      if (!type) return fail(res, '上传类型不能为空');
      const userId = req.user!.userId;
      const result = await uploadService.getSTSToken(type, userId);
      return success(res, result, '获取STS凭证成功');
    } catch (err: any) {
      return fail(res, err.message, err.statusCode || 500);
    }
  },

  async getSignedUrl(req: Request, res: Response) {
    try {
      const { type, filename } = req.body;
      if (!type) return fail(res, '上传类型不能为空');
      if (!filename) return fail(res, '文件名不能为空');
      const userId = req.user!.userId;
      const result = await uploadService.getSignedUploadUrl(type, userId, filename);
      return success(res, result, '获取签名URL成功');
    } catch (err: any) {
      return fail(res, err.message, err.statusCode || 500);
    }
  },
};