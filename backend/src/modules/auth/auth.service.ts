import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { sendEmailCode } from '../../utils/email';
import { JwtPayload } from '../../middlewares/auth';
import { badRequest, unauthorized, forbidden, notFound, conflict } from '../../common/errors';
import { PasswordUtil } from '../../common/password';
import { VerificationUtil, EmailCodeType } from '../../common/verification';
import { TokenUtil } from '../../common/token';
import { USER_PROFILE_SELECT } from '../../common/selects';

const LOGIN_FAIL_LOCK_THRESHOLD = 5;
const LOGIN_LOCK_MINUTES = 30;

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

function signRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

function getRefreshExpiry(): Date {
  const ms = parseDuration(env.JWT_REFRESH_EXPIRES_IN);
  return new Date(Date.now() + ms);
}

function parseDuration(d: string): number {
  const match = d.match(/^(\d+)(d|h|m|s)$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const n = parseInt(match[1], 10);
  const unit: Record<string, number> = { d: 86400000, h: 3600000, m: 60000, s: 1000 };
  return n * (unit[match[2]] || 0);
}

interface UserForToken {
  id: number;
  email: string;
  username: string;
  avatar: string | null;
  role: string;
  creditScore: number;
}

async function signTokensAndStore(user: UserForToken, userAgent?: string, ipAddress?: string) {
  const payload: JwtPayload = { userId: user.id, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  const tokenHash = hashToken(refreshToken);
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: getRefreshExpiry(),
      userAgent: userAgent || null,
      ipAddress: ipAddress || null,
    },
  });

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      avatar: user.avatar,
      role: user.role,
      creditScore: user.creditScore,
    },
  };
}

function validateEmailCodeType(type: string): EmailCodeType | null {
  const validTypes = Object.values(EmailCodeType);
  return validTypes.includes(type as EmailCodeType) ? (type as EmailCodeType) : null;
}

function validateUserBlockStatus(user: { id: number; isBlocked: boolean; blockedUntil: Date | null }) {
  if (user.isBlocked) {
    if (user.blockedUntil && user.blockedUntil > new Date()) {
      throw forbidden(`账号已被封禁，解封时间：${user.blockedUntil.toLocaleString()}`);
    }
    return prisma.user.update({ where: { id: user.id }, data: { isBlocked: false, blockedUntil: null } });
  }
  return Promise.resolve();
}

export const AuthService = {
  async sendCode(email: string, type: string) {
    const emailCodeType = validateEmailCodeType(type);
    if (!emailCodeType) {
      throw badRequest('无效的验证码类型');
    }

    if (emailCodeType === EmailCodeType.REGISTER) {
      const exists = await prisma.user.findUnique({ where: { email } });
      if (exists) throw conflict('该邮箱已注册');
    }

    if (emailCodeType === EmailCodeType.RESET_PASSWORD) {
      const exists = await prisma.user.findUnique({ where: { email } });
      if (!exists) throw notFound('该邮箱未注册');
    }

    const oneMinuteAgo = new Date(Date.now() - 60_000);
    const recent = await prisma.emailCode.findFirst({
      where: { email, type: emailCodeType, createdAt: { gt: oneMinuteAgo } },
      orderBy: { createdAt: 'desc' },
    });
    if (recent) throw conflict('发送太频繁，请1分钟后再试');

    const code = await VerificationUtil.createCode(email, emailCodeType);
    await sendEmailCode(email, code, type);
  },

  async register(data: { email: string; code: string; username: string; password: string }) {
    const { email, code, username, password } = data;

    const [existingEmail, existingUsername] = await Promise.all([
      prisma.user.findUnique({ where: { email } }),
      prisma.user.findUnique({ where: { username } }),
    ]);
    if (existingEmail) throw conflict('该邮箱已注册');
    if (existingUsername) throw conflict('该用户名已被使用');

    const [emailCode, passwordHash] = await Promise.all([
      VerificationUtil.verifyEmailCode(email, code, EmailCodeType.REGISTER),
      PasswordUtil.hash(password),
    ]);

    const user = await prisma.user.create({
      data: { email, username, passwordHash },
    });

    await VerificationUtil.markCodeUsed(emailCode.id);

    return { id: user.id, email: user.email, username: user.username };
  },

  async loginByEmailPassword(email: string, password: string, userAgent?: string, ipAddress?: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw unauthorized('邮箱或密码错误');

    await validateUserBlockStatus(user);

    if (user.loginFailCount >= LOGIN_FAIL_LOCK_THRESHOLD) {
      const lockExpiry = new Date(user.updatedAt.getTime() + LOGIN_LOCK_MINUTES * 60_000);
      if (lockExpiry > new Date()) {
        throw forbidden(`密码错误次数过多，请${LOGIN_LOCK_MINUTES}分钟后再试`);
      }
      await prisma.user.update({ where: { id: user.id }, data: { loginFailCount: 0 } });
    }

    const valid = await PasswordUtil.verify(password, user.passwordHash);
    if (!valid) {
      await prisma.user.update({
        where: { id: user.id },
        data: { loginFailCount: { increment: 1 } },
      });
      throw unauthorized('邮箱或密码错误');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { loginFailCount: 0, lastLoginAt: new Date() },
    });

    return signTokensAndStore(user, userAgent, ipAddress);
  },

  async loginByEmailCode(email: string, code: string, userAgent?: string, ipAddress?: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw notFound('该邮箱未注册');

    await validateUserBlockStatus(user);

    const emailCode = await VerificationUtil.verifyEmailCode(email, code, EmailCodeType.LOGIN);

    await Promise.all([
      VerificationUtil.markCodeUsed(emailCode.id),
      prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      }),
    ]);

    return signTokensAndStore(user, userAgent, ipAddress);
  },

  async refreshToken(oldRefreshToken: string, userAgent?: string, ipAddress?: string) {
    const tokenHash = hashToken(oldRefreshToken);

    const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!stored) throw unauthorized('无效的Refresh Token');
    if (stored.isRevoked) throw unauthorized('Refresh Token已被吊销');
    if (stored.expiresAt < new Date()) throw unauthorized('Refresh Token已过期');

    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { isRevoked: true },
    });

    const user = await prisma.user.findUnique({ where: { id: stored.userId } });
    if (!user) throw notFound('用户不存在');

    const payload: JwtPayload = { userId: user.id, role: user.role };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    const newTokenHash = hashToken(refreshToken);
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: newTokenHash,
        expiresAt: getRefreshExpiry(),
        userAgent: userAgent || null,
        ipAddress: ipAddress || null,
      },
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  },

  async logout(userId: number, refreshToken?: string) {
    if (refreshToken) {
      const tokenHash = hashToken(refreshToken);
      await TokenUtil.revokeToken(tokenHash, userId);
    } else {
      await TokenUtil.revokeAllUserTokens(userId);
    }
  },

  async resetPassword(email: string, code: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw notFound('该邮箱未注册');

    const emailCode = await VerificationUtil.verifyEmailCode(email, code, EmailCodeType.RESET_PASSWORD);

    const passwordHash = await PasswordUtil.hash(newPassword);

    await Promise.all([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash, loginFailCount: 0 },
      }),
      VerificationUtil.markCodeUsed(emailCode.id),
      TokenUtil.revokeAllUserTokens(user.id),
    ]);
  },

  async getProfile(userId: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: USER_PROFILE_SELECT,
    });
    if (!user) throw notFound('用户不存在');
    return user;
  },
};
