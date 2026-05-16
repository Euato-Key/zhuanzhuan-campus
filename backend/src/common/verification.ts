import crypto from 'crypto';
import { prisma } from '../config/prisma';
import { AppError, badRequest } from './errors';

/**
 * 验证码类型枚举
 */
export enum EmailCodeType {
  REGISTER = 'register',
  LOGIN = 'login',
  RESET_PASSWORD = 'reset_password',
  CHANGE_EMAIL = 'change_email',
}

const CODE_LENGTH = 6;
const CODE_EXPIRE_MINUTES = 5;

/**
 * 验证码工具
 * 使用加密安全的随机数生成器
 */
export const VerificationUtil = {
  /**
   * 生成加密安全的验证码
   */
  generateCode(): string {
    // 使用 crypto.randomInt 代替 Math.random（更安全）
    const digits: number[] = [];
    for (let i = 0; i < CODE_LENGTH; i++) {
      digits.push(crypto.randomInt(0, 10));
    }
    return digits.join('');
  },

  /**
   * 安全比较验证码（防止时序攻击）
   */
  safeCompare(code1: string, code2: string): boolean {
    if (code1.length !== code2.length) return false;
    try {
      return crypto.timingSafeEqual(
        Buffer.from(code1, 'utf8'),
        Buffer.from(code2, 'utf8')
      );
    } catch {
      return false;
    }
  },

  /**
   * 计算过期时间
   */
  getExpiryTime(): Date {
    return new Date(Date.now() + CODE_EXPIRE_MINUTES * 60_000);
  },

  /**
   * 验证邮箱验证码
   * @returns 验证码记录，验证成功后返回
   */
  async verifyEmailCode(
    email: string,
    code: string,
    type: EmailCodeType | string
  ): Promise<{ id: number; code: string }> {
    const emailCode = await prisma.emailCode.findFirst({
      where: {
        email,
        type: type as any,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!emailCode) {
      throw badRequest('验证码无效或已过期');
    }

    // 使用安全比较防止时序攻击
    if (!this.safeCompare(emailCode.code, code)) {
      throw badRequest('验证码错误');
    }

    return emailCode;
  },

  /**
   * 标记验证码已使用
   */
  async markCodeUsed(codeId: number): Promise<void> {
    await prisma.emailCode.update({
      where: { id: codeId },
      data: { isUsed: true },
    });
  },

  /**
   * 创建验证码记录
   */
  async createCode(email: string, type: EmailCodeType | string): Promise<string> {
    const code = this.generateCode();
    const expiresAt = this.getExpiryTime();

    await prisma.emailCode.create({
      data: { email, code, type: type as any, expiresAt },
    });

    return code;
  },
};