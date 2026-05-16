/**
 * 自定义应用错误类
 * 统一错误处理，避免重复的 Object.assign(new Error(), { statusCode }) 模式
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.name = 'AppError';

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 快捷方法：创建 400 错误
 */
export function badRequest(message: string): AppError {
  return new AppError(message, 400);
}

/**
 * 快捷方法：创建 401 错误
 */
export function unauthorized(message: string = '未授权'): AppError {
  return new AppError(message, 401);
}

/**
 * 快捷方法：创建 403 错误
 */
export function forbidden(message: string = '无权限'): AppError {
  return new AppError(message, 403);
}

/**
 * 快捷方法：创建 404 错误
 */
export function notFound(message: string = '资源不存在'): AppError {
  return new AppError(message, 404);
}

/**
 * 快捷方法：创建 409 冲突错误
 */
export function conflict(message: string): AppError {
  return new AppError(message, 409);
}
