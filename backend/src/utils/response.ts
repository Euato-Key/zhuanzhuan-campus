import { Response } from 'express';
import { Decimal } from '@prisma/client/runtime/library';

interface ApiResponse<T = unknown> {
  code: number;
  data: T | null;
  message: string;
}

// 递归转换特殊类型为可序列化的值
function serializeData(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }
  // 处理 BigInt
  if (typeof obj === 'bigint') {
    return obj.toString();
  }
  // 处理 Decimal
  if (obj instanceof Decimal) {
    return obj.toNumber();
  }
  // 处理 Date
  if (obj instanceof Date) {
    return obj.toISOString();
  }
  if (Array.isArray(obj)) {
    return obj.map(serializeData);
  }
  if (typeof obj === 'object') {
    // 检查是否是普通对象（不是类实例）
    const proto = Object.getPrototypeOf(obj);
    if (proto === null || proto === Object.prototype) {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = serializeData(value);
      }
      return result;
    }
    // 其他类实例，尝试转为普通对象
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = serializeData(value);
    }
    return result;
  }
  return obj;
}

export function success<T>(res: Response, data: T, message = 'success', statusCode = 200) {
  const serializedData = serializeData(data) as T;
  const body: ApiResponse<T> = { code: 200, data: serializedData, message };
  return res.status(statusCode).json(body);
}

export function fail(res: Response, message: string, statusCode = 400) {
  const body: ApiResponse = { code: statusCode, data: null, message };
  return res.status(statusCode).json(body);
}
