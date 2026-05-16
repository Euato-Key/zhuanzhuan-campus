import { Request } from 'express';
import { badRequest, unauthorized } from './errors';

const PASSWORD_MIN_LENGTH = 6;
const USERNAME_MIN_LENGTH = 2;
const USERNAME_MAX_LENGTH = 50;
const CATEGORY_NAME_MAX_LENGTH = 50;
const PHONE_REGEX = /^1[3-9]\d{9}$/;

export const ValidationUtil = {
  validatePassword(password: string): void {
    if (!password || password.length < PASSWORD_MIN_LENGTH) {
      throw badRequest(`密码长度不能少于${PASSWORD_MIN_LENGTH}位`);
    }
  },

  validateUsername(username: string): void {
    if (!username || username.length < USERNAME_MIN_LENGTH || username.length > USERNAME_MAX_LENGTH) {
      throw badRequest(`用户名长度需在${USERNAME_MIN_LENGTH}-${USERNAME_MAX_LENGTH}之间`);
    }
  },

  validateCategoryName(name: string): void {
    if (!name || name.length > CATEGORY_NAME_MAX_LENGTH) {
      throw badRequest(`分类名称不能超过${CATEGORY_NAME_MAX_LENGTH}个字符`);
    }
  },

  validateEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      throw badRequest('邮箱格式不正确');
    }
  },

  validatePhone(phone: string): void {
    if (!phone || !PHONE_REGEX.test(phone)) {
      throw badRequest('手机号格式不正确');
    }
  },

  requireNonEmptyString(value: string | undefined, fieldName: string): string {
    if (!value || !value.trim()) {
      throw badRequest(`请填写${fieldName}`);
    }
    return value.trim();
  },

  parseIdParam(value: string | string[] | undefined, fieldName: string = 'ID'): number {
    const param = Array.isArray(value) ? value[0] : value;
    if (!param) {
      throw badRequest(`无效的${fieldName}`);
    }
    const id = parseInt(param, 10);
    if (isNaN(id) || id <= 0) {
      throw badRequest(`无效的${fieldName}`);
    }
    return id;
  },

  parseBigIntParam(value: string | string[] | undefined, fieldName: string = 'ID'): bigint {
    const param = Array.isArray(value) ? value[0] : value;
    if (!param) {
      throw badRequest(`无效的${fieldName}`);
    }
    try {
      const id = BigInt(param);
      if (id <= 0) {
        throw badRequest(`无效的${fieldName}`);
      }
      return id;
    } catch {
      throw badRequest(`无效的${fieldName}`);
    }
  },

  requireUserId(req: Request): number {
    if (!req.user?.userId) {
      throw unauthorized('用户未登录');
    }
    return req.user.userId;
  },

  getRequestMeta(req: Request): { userAgent: string | undefined; ip: string | undefined } {
    return {
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.socket.remoteAddress,
    };
  },
};