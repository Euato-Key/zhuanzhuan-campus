import { prisma } from '../config/prisma';

/**
 * Token 工具
 * 统一 Refresh Token 操作
 */
export const TokenUtil = {
  /**
   * 撤销用户所有未过期的 refresh token
   */
  async revokeAllUserTokens(userId: number): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });
  },

  /**
   * 撤销单个 refresh token
   */
  async revokeToken(tokenHash: string, userId: number): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { tokenHash, userId },
      data: { isRevoked: true },
    });
  },

  /**
   * 清理过期的 refresh tokens（可定期执行）
   */
  async cleanupExpiredTokens(): Promise<number> {
    const result = await prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { isRevoked: true },
        ],
      },
    });
    return result.count;
  },
};