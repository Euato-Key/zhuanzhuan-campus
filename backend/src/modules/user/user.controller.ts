import { Request, Response } from 'express';
import { success } from '../../utils/response';
import { UserService } from './user.service';
import { asyncHandler } from '../../common/asyncHandler';
import { ValidationUtil } from '../../common/validation';

export const UserController = {
  updateProfile: asyncHandler(async (req: Request, res: Response) => {
    const { username, school, campus, phone, bio } = req.body;
    const userId = ValidationUtil.requireUserId(req);
    const user = await UserService.updateProfile(userId, { username, school, campus, phone, bio });
    return success(res, user, '更新资料成功');
  }),

  changePassword: asyncHandler(async (req: Request, res: Response) => {
    const { oldPassword, newPassword } = req.body;
    const userId = ValidationUtil.requireUserId(req);
    ValidationUtil.validatePassword(newPassword);
    await UserService.changePassword(userId, oldPassword, newPassword);
    return success(res, null, '修改密码成功，请重新登录');
  }),

  changeEmail: asyncHandler(async (req: Request, res: Response) => {
    const { newEmail, code } = req.body;
    const userId = ValidationUtil.requireUserId(req);
    await UserService.changeEmail(userId, newEmail, code);
    return success(res, null, '修改邮箱成功，请重新登录');
  }),

  updateAvatar: asyncHandler(async (req: Request, res: Response) => {
    const { tempPath } = req.body;
    const userId = ValidationUtil.requireUserId(req);
    const user = await UserService.updateAvatar(userId, tempPath);
    return success(res, user, '更新头像成功');
  }),

  getPublicProfile: asyncHandler(async (req: Request, res: Response) => {
    const userId = ValidationUtil.parseIdParam(req.params.id, '用户ID');
    const user = await UserService.getPublicProfile(userId);
    return success(res, user);
  }),
};
