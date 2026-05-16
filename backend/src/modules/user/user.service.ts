import { prisma } from '../../config/prisma';
import { FileService } from '../../services/file.service';
import { badRequest, unauthorized, notFound, conflict } from '../../common/errors';
import { PasswordUtil } from '../../common/password';
import { VerificationUtil, EmailCodeType } from '../../common/verification';
import { TokenUtil } from '../../common/token';
import { USER_PROFILE_SELECT, USER_PUBLIC_PROFILE_SELECT } from '../../common/selects';

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
        throw badRequest('用户名长度需在2-50之间');
      }
      const existing = await prisma.user.findUnique({ where: { username: data.username } });
      if (existing && existing.id !== userId) {
        throw conflict('该用户名已被使用');
      }
    }

    if (data.phone && !/^1[3-9]\d{9}$/.test(data.phone)) {
      throw badRequest('手机号格式不正确');
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: USER_PROFILE_SELECT,
    });

    return user;
  },

  async changePassword(userId: number, oldPassword: string, newPassword: string) {
    if (!oldPassword || !newPassword) {
      throw badRequest('旧密码和新密码不能为空');
    }
    if (newPassword.length < 6) {
      throw badRequest('新密码长度不能少于6位');
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw notFound('用户不存在');

    const valid = await PasswordUtil.verify(oldPassword, user.passwordHash);
    if (!valid) throw unauthorized('旧密码错误');

    const passwordHash = await PasswordUtil.hash(newPassword);

    await Promise.all([
      prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
      }),
      TokenUtil.revokeAllUserTokens(userId),
    ]);
  },

  async changeEmail(userId: number, newEmail: string, code: string) {
    if (!newEmail || !code) {
      throw badRequest('新邮箱和验证码不能为空');
    }

    const existing = await prisma.user.findUnique({ where: { email: newEmail } });
    if (existing && existing.id !== userId) {
      throw conflict('该邮箱已被其他用户使用');
    }

    const emailCode = await VerificationUtil.verifyEmailCode(newEmail, code, EmailCodeType.CHANGE_EMAIL);

    await Promise.all([
      prisma.user.update({
        where: { id: userId },
        data: { email: newEmail },
      }),
      VerificationUtil.markCodeUsed(emailCode.id),
      TokenUtil.revokeAllUserTokens(userId),
    ]);
  },

  async updateAvatar(userId: number, tempPath: string) {
    if (!tempPath) {
      throw badRequest('临时文件路径不能为空');
    }

    const permanentPath = await FileService.moveFileToPermanent(tempPath, 'avatar', userId);

    const user = await prisma.user.update({
      where: { id: userId },
      data: { avatar: permanentPath },
      select: USER_PROFILE_SELECT,
    });

    return user;
  },

  async getPublicProfile(userId: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: USER_PUBLIC_PROFILE_SELECT,
    });
    if (!user) throw notFound('用户不存在');
    return user;
  },
};
