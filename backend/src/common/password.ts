import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

/**
 * 密码哈希工具
 * 统一密码处理逻辑，避免在多个 service 中重复定义
 */
export const PasswordUtil = {
  /**
   * 对密码进行哈希
   */
  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  },

  /**
   * 验证密码是否匹配
   */
  async verify(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  },

  /**
   * 验证密码强度
   * @returns 错误信息，如果密码有效则返回 null
   */
  validate(password: string): string | null {
    if (!password) return '密码不能为空';
    if (password.length < 6) return '密码长度不能少于6位';
    return null;
  },
};
