import { Response } from 'express';

interface ApiResponse<T = unknown> {
  code: number;
  data: T | null;
  message: string;
}

export function success<T>(res: Response, data: T, message = 'success', statusCode = 200) {
  const body: ApiResponse<T> = { code: statusCode, data, message };
  return res.status(statusCode).json(body);
}

export function fail(res: Response, message: string, statusCode = 400) {
  const body: ApiResponse = { code: statusCode, data: null, message };
  return res.status(statusCode).json(body);
}
