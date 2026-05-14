import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { sendEmailCode } from '../../utils/email';
import { JwtPayload } from '../../middlewares/auth';

const SALT_ROUNDS = 10;
const CODE_EXPIRE_MINUTES = 5;
const LOGIN_FAIL_LOCK_THRESHOLD = 5;
const LOGIN_LOCK_MINUTES = 30;

function generateCode(): string {
  return Math.random().toString().slice(2, 8);
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as any,
  });
}

function signRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as any,
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

async function signTokensAndStore(user: any, userAgent?: string, ipAddress?: string) {
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

export const AuthService = {
  async sendCode(email: string, type: string) {
    const validTypes = ['register', 'login', 'reset_password', 'change_email'];
    if (!validTypes.includes(type)) {
      throw Object.assign(new Error('无效的验证码类型'), { statusCode: 400 });
    }

    if (type === 'register') {
      const exists = await prisma.user.findUnique({ where: { email } });
      if (exists) throw Object.assign(new Error('该邮箱已注册'), { statusCode: 409 });
    }

    if (type === 'reset_password') {
      const exists = await prisma.user.findUnique({ where: { email } });
      if (!exists) throw Object.assign(new Error('该邮箱未注册'), { statusCode: 404 });
    }

    const oneMinuteAgo = new Date(Date.now() - 60_000);
    const recent = await prisma.emailCode.findFirst({
      where: { email, type: type as any, createdAt: { gt: oneMinuteAgo } },
      orderBy: { createdAt: 'desc' },
    });
    if (recent) throw Object.assign(new Error('发送太频繁，请1分钟后再试'), { statusCode: 429 });

    const code = generateCode();
    const expiresAt = new Date(Date.now() + CODE_EXPIRE_MINUTES * 60_000);

    await prisma.emailCode.create({
      data: { email, code, type: type as any, expiresAt },
    });

    await sendEmailCode(email, code, type);
  },

  async register(data: { email: string; code: string; username: string; password: string }) {
    const { email, code, username, password } = data;

    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) throw Object.assign(new Error('该邮箱已注册'), { statusCode: 409 });

    const existingUsername = await prisma.user.findUnique({ where: { username } });
    if (existingUsername) throw Object.assign(new Error('该用户名已被使用'), { statusCode: 409 });

    const emailCode = await prisma.emailCode.findFirst({
      where: { email, type: 'register', isUsed: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!emailCode) throw Object.assign(new Error('验证码无效或已过期'), { statusCode: 400 });
    if (emailCode.code !== code) throw Object.assign(new Error('验证码错误'), { statusCode: 400 });

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: { email, username, passwordHash },
    });

    await prisma.emailCode.update({
      where: { id: emailCode.id },
      data: { isUsed: true },
    });

    return { id: user.id, email: user.email, username: user.username };
  },

  async loginByEmailPassword(email: string, password: string, userAgent?: string, ipAddress?: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw Object.assign(new Error('邮箱或密码错误'), { statusCode: 401 });

    if (user.isBlocked) {
      if (user.blockedUntil && user.blockedUntil > new Date()) {
        throw Object.assign(new Error(`账号已被封禁，解封时间：${user.blockedUntil.toLocaleString()}`), { statusCode: 403 });
      }
      await prisma.user.update({ where: { id: user.id }, data: { isBlocked: false, blockedUntil: null } });
    }

    if (user.loginFailCount >= LOGIN_FAIL_LOCK_THRESHOLD) {
      const lockExpiry = new Date(user.updatedAt.getTime() + LOGIN_LOCK_MINUTES * 60_000);
      if (lockExpiry > new Date()) {
        throw Object.assign(new Error(`密码错误次数过多，请${LOGIN_LOCK_MINUTES}分钟后再试`), { statusCode: 423 });
      }
      await prisma.user.update({ where: { id: user.id }, data: { loginFailCount: 0 } });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      await prisma.user.update({
        where: { id: user.id },
        data: { loginFailCount: { increment: 1 } },
      });
      throw Object.assign(new Error('邮箱或密码错误'), { statusCode: 401 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { loginFailCount: 0, lastLoginAt: new Date() },
    });

    return signTokensAndStore(user, userAgent, ipAddress);
  },

  async loginByEmailCode(email: string, code: string, userAgent?: string, ipAddress?: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw Object.assign(new Error('该邮箱未注册'), { statusCode: 404 });

    if (user.isBlocked) {
      if (user.blockedUntil && user.blockedUntil > new Date()) {
        throw Object.assign(new Error(`账号已被封禁，解封时间：${user.blockedUntil.toLocaleString()}`), { statusCode: 403 });
      }
      await prisma.user.update({ where: { id: user.id }, data: { isBlocked: false, blockedUntil: null } });
    }

    const emailCode = await prisma.emailCode.findFirst({
      where: { email, type: 'login', isUsed: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!emailCode) throw Object.assign(new Error('验证码无效或已过期'), { statusCode: 400 });
    if (emailCode.code !== code) throw Object.assign(new Error('验证码错误'), { statusCode: 400 });

    await prisma.emailCode.update({
      where: { id: emailCode.id },
      data: { isUsed: true },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return signTokensAndStore(user, userAgent, ipAddress);
  },

  async refreshToken(oldRefreshToken: string, userAgent?: string, ipAddress?: string) {
    const tokenHash = hashToken(oldRefreshToken);

    const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!stored) throw Object.assign(new Error('无效的Refresh Token'), { statusCode: 401 });
    if (stored.isRevoked) throw Object.assign(new Error('Refresh Token已被吊销'), { statusCode: 401 });
    if (stored.expiresAt < new Date()) throw Object.assign(new Error('Refresh Token已过期'), { statusCode: 401 });

    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { isRevoked: true },
    });

    const user = await prisma.user.findUnique({ where: { id: stored.userId } });
    if (!user) throw Object.assign(new Error('用户不存在'), { statusCode: 404 });

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
      await prisma.refreshToken.updateMany({
        where: { tokenHash, userId },
        data: { isRevoked: true },
      });
    } else {
      await prisma.refreshToken.updateMany({
        where: { userId, isRevoked: false },
        data: { isRevoked: true },
      });
    }
  },

  async resetPassword(email: string, code: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw Object.assign(new Error('该邮箱未注册'), { statusCode: 404 });

    const emailCode = await prisma.emailCode.findFirst({
      where: { email, type: 'reset_password', isUsed: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!emailCode) throw Object.assign(new Error('验证码无效或已过期'), { statusCode: 400 });
    if (emailCode.code !== code) throw Object.assign(new Error('验证码错误'), { statusCode: 400 });

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, loginFailCount: 0 },
    });

    await prisma.emailCode.update({
      where: { id: emailCode.id },
      data: { isUsed: true },
    });

    await prisma.refreshToken.updateMany({
      where: { userId: user.id, isRevoked: false },
      data: { isRevoked: true },
    });
  },

  async getProfile(userId: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        avatar: true,
        bio: true,
        school: true,
        campus: true,
        phone: true,
        role: true,
        creditScore: true,
        createdAt: true,
      },
    });
    if (!user) throw Object.assign(new Error('用户不存在'), { statusCode: 404 });
    return user;
  },
};
