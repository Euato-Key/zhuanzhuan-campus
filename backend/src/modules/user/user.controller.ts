import { Request, Response } from 'express';
import { success } from '../../utils/response';
import { UserService } from './user.service';
import { asyncHandler } from '../../common/asyncHandler';
import { ValidationUtil } from '../../common/validation';
import { badRequest } from '../../common/errors';

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

  // ─── Admin ───

  adminList: asyncHandler(async (req: Request, res: Response) => {
    const { keyword, status, page, pageSize } = req.query;
    const result = await UserService.getAdminList({
      keyword: typeof keyword === 'string' ? keyword : undefined,
      status: typeof status === 'string' ? status : undefined,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
    return success(res, result);
  }),

  adminBan: asyncHandler(async (req: Request, res: Response) => {
    const userId = ValidationUtil.parseIdParam(req.params.id, '用户ID');
    const user = await UserService.banUser(userId);
    return success(res, user, '封禁成功');
  }),

  adminUnban: asyncHandler(async (req: Request, res: Response) => {
    const userId = ValidationUtil.parseIdParam(req.params.id, '用户ID');
    const user = await UserService.unbanUser(userId);
    return success(res, user, '解封成功');
  }),

  adminSetRole: asyncHandler(async (req: Request, res: Response) => {
    const userId = ValidationUtil.parseIdParam(req.params.id, '用户ID');
    if (userId === req.user!.userId) {
      throw badRequest('不能修改自己的角色');
    }
    const { role } = req.body;
    if (!role || !['user', 'admin'].includes(role)) {
      throw badRequest('无效的角色');
    }
    const user = await UserService.setRole(userId, role as 'user' | 'admin');
    return success(res, user, '角色修改成功');
  }),
};
