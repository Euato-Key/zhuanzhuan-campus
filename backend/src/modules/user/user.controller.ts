import { Request, Response } from 'express';
import { success, fail } from '../../utils/response';
import { UserService } from './user.service';

export const UserController = {
  async updateProfile(req: Request, res: Response) {
    try {
      const { username, school, campus, phone, bio } = req.body;
      const userId = req.user!.userId;
      const user = await UserService.updateProfile(userId, { username, school, campus, phone, bio });
      return success(res, user, '更新资料成功');
    } catch (err: any) {
      return fail(res, err.message, err.statusCode || 500);
    }
  },

  async changePassword(req: Request, res: Response) {
    try {
      const { oldPassword, newPassword } = req.body;
      const userId = req.user!.userId;
      await UserService.changePassword(userId, oldPassword, newPassword);
      return success(res, null, '修改密码成功，请重新登录');
    } catch (err: any) {
      return fail(res, err.message, err.statusCode || 500);
    }
  },

  async changeEmail(req: Request, res: Response) {
    try {
      const { newEmail, code } = req.body;
      const userId = req.user!.userId;
      await UserService.changeEmail(userId, newEmail, code);
      return success(res, null, '修改邮箱成功，请重新登录');
    } catch (err: any) {
      return fail(res, err.message, err.statusCode || 500);
    }
  },

  async updateAvatar(req: Request, res: Response) {
    try {
      const { tempPath } = req.body;
      const userId = req.user!.userId;
      const user = await UserService.updateAvatar(userId, tempPath);
      return success(res, user, '更新头像成功');
    } catch (err: any) {
      return fail(res, err.message, err.statusCode || 500);
    }
  },

  async getPublicProfile(req: Request, res: Response) {
    try {
      const idParam = req.params.id;
      const userId = parseInt(Array.isArray(idParam) ? idParam[0] : idParam, 10);
      if (isNaN(userId)) return fail(res, '无效的用户ID', 400);
      const user = await UserService.getPublicProfile(userId);
      return success(res, user);
    } catch (err: any) {
      return fail(res, err.message, err.statusCode || 500);
    }
  },
};