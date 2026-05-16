import { Request, Response, NextFunction } from 'express';
import { unauthorized, forbidden } from '../common/errors';

type UserRole = 'user' | 'admin' | 'super_admin';

function createRoleMiddleware(allowedRoles: UserRole[], errorMessage: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      throw unauthorized('未登录');
    }

    if (!allowedRoles.includes(user.role as UserRole)) {
      throw forbidden(errorMessage);
    }

    next();
  };
}

export const adminMiddleware = createRoleMiddleware(
  ['admin', 'super_admin'],
  '无权限访问'
);

export const superAdminMiddleware = createRoleMiddleware(
  ['super_admin'],
  '需要超级管理员权限'
);