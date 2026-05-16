import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { JwtPayload } from './auth';

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    const token = header.slice(7);
    try {
      const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
      req.user = payload;
    } catch {
      // token 无效或过期，忽略，继续作为未登录用户
    }
  }
  next();
}