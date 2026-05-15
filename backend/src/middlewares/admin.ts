import { Request, Response, NextFunction } from 'express';
import { fail } from '../utils/response';

export function adminMiddleware(req: Request, res: Response, next: NextFunction) {
  const user = req.user;

  if (!user) {
    return fail(res, '未登录', 401);
  }

  if (user.role !== 'admin' && user.role !== 'super_admin') {
    return fail(res, '无权限访问', 403);
  }

  next();
}

export function superAdminMiddleware(req: Request, res: Response, next: NextFunction) {
  const user = req.user;

  if (!user) {
    return fail(res, '未登录', 401);
  }

  if (user.role !== 'super_admin') {
    return fail(res, '需要超级管理员权限', 403);
  }

  next();
}