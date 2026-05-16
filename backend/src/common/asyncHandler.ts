import { Request, Response, NextFunction } from 'express';

/**
 * 异步路由处理器包装函数
 * 捕获异常后交给 Express 错误中间件统一处理
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await fn(req, res, next);
    } catch (err: unknown) {
      next(err);
    }
  };
}