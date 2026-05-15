import bcrypt from 'bcryptjs';
import { prisma } from '../../config/prisma';
import { FileService } from '../../services/file.service';

const SALT_ROUNDS = 10;

const PROFILE_SELECT = {
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
};

const PUBLIC_PROFILE_SELECT = {
  id: true,
  username: true,
  avatar: true,
  bio: true,
  school: true,
  campus: true,
  creditScore: true,
  createdAt: true,
};

export const UserService = {
  async updateProfile(userId: number, data: {
    username?: string;
    school?: string;
    campus?: string;
    phone?: string;
    bio?: string;
  }) {
    if (data.username) {
      if (data.username.length < 2 || data.username.length > 50) {
        throw Object.assign(new Error('用户名长度需在2-50之间'), { statusCode: 400 });
      }
      const existing = await prisma.user.findUnique({ where: { username: data.username } });
      if (existing && existing.id !== userId) {
        throw Object.assign(new Error('该用户名已被使用'), { statusCode: 409 });
      }
    }

    if (data.phone && !/^1[3-9]\d{9}$/.test(data.phone)) {
      throw Object.assign(new Error('手机号格式不正确'), { statusCode: 400 });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: PROFILE_SELECT,
    });

    return user;
  },

  async changePassword(userId: number, oldPassword: string, newPassword: string) {
    if (!oldPassword || !newPassword) {
      throw Object.assign(new Error('旧密码和新密码不能为空'), { statusCode: 400 });
    }
    if (newPassword.length < 6) {
      throw Object.assign(new Error('新密码长度不能少于6位'), { statusCode: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw Object.assign(new Error('用户不存在'), { statusCode: 404 });

    const valid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!valid) throw Object.assign(new Error('旧密码错误'), { statusCode: 401 });

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    await prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });
  },

  async changeEmail(userId: number, newEmail: string, code: string) {
    if (!newEmail || !code) {
      throw Object.assign(new Error('新邮箱和验证码不能为空'), { statusCode: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email: newEmail } });
    if (existing && existing.id !== userId) {
      throw Object.assign(new Error('该邮箱已被其他用户使用'), { statusCode: 409 });
    }

    const emailCode = await prisma.emailCode.findFirst({
      where: { email: newEmail, type: 'change_email', isUsed: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!emailCode) throw Object.assign(new Error('验证码无效或已过期'), { statusCode: 400 });
    if (emailCode.code !== code) throw Object.assign(new Error('验证码错误'), { statusCode: 400 });

    await prisma.user.update({
      where: { id: userId },
      data: { email: newEmail },
    });

    await prisma.emailCode.update({
      where: { id: emailCode.id },
      data: { isUsed: true },
    });

    await prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });
  },

  async updateAvatar(userId: number, tempPath: string) {
    if (!tempPath) {
      throw Object.assign(new Error('临时文件路径不能为空'), { statusCode: 400 });
    }

    const permanentPath = await FileService.moveFileToPermanent(tempPath, 'avatar', userId);

    const user = await prisma.user.update({
      where: { id: userId },
      data: { avatar: permanentPath },
      select: PROFILE_SELECT,
    });

    return user;
  },

  async getPublicProfile(userId: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: PUBLIC_PROFILE_SELECT,
    });
    if (!user) throw Object.assign(new Error('用户不存在'), { statusCode: 404 });
    return user;
  },
};