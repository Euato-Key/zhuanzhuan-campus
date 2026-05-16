import { Request, Response, NextFunction } from 'express';
import { fail } from '../utils/response';

/**
 * 异步路由处理器包装函数
 * 统一处理 try-catch 和错误响应，避免在每个 controller 方法中重复
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await fn(req, res, next);
    } catch (err: unknown) {
      const error = err as Error & { statusCode?: number };
      return fail(res, error.message, error.statusCode || 500);
    }
  };
}