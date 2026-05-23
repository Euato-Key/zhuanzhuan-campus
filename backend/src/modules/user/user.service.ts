import { prisma } from '../../config/prisma';
import { FileService } from '../../services/file.service';
import { badRequest, unauthorized, notFound, conflict } from '../../common/errors';
import { PasswordUtil } from '../../common/password';
import { VerificationUtil, EmailCodeType } from '../../common/verification';
import { TokenUtil } from '../../common/token';
import { ValidationUtil } from '../../common/validation';
import { PaginationUtil } from '../../common/pagination';
import { USER_PROFILE_SELECT, USER_PUBLIC_PROFILE_SELECT } from '../../common/selects';
import { NotificationService } from '../notification/notification.service';

export const UserService = {
  async updateProfile(userId: number, data: {
    username?: string;
    school?: string;
    campus?: string;
    phone?: string;
    bio?: string;
  }) {
    if (data.username) {
      ValidationUtil.validateUsername(data.username);
      const existing = await prisma.user.findUnique({ where: { username: data.username } });
      if (existing && existing.id !== userId) {
        throw conflict('该用户名已被使用');
      }
    }

    if (data.phone) {
      ValidationUtil.validatePhone(data.phone);
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
    ValidationUtil.validatePassword(newPassword);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });
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

    // 通知用户密码修改成功
    await NotificationService.create({
      userId,
      type: 'system',
      title: '密码修改成功',
      content: '您的账号密码已成功修改，如非本人操作请立即联系客服',
    });
  },

  async changeEmail(userId: number, newEmail: string, code: string) {
    if (!newEmail || !code) {
      throw badRequest('新邮箱和验证码不能为空');
    }
    ValidationUtil.validateEmail(newEmail);

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

    // 通知用户邮箱修改成功
    await NotificationService.create({
      userId,
      type: 'system',
      title: '邮箱修改成功',
      content: `您的账号邮箱已成功修改为${newEmail}，如非本人操作请立即联系客服`,
    });
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

  // ─── Admin ───

  async getAdminList(query: { page?: number; pageSize?: number; keyword?: string; status?: string }) {
    const { skip, take, page, pageSize } = PaginationUtil.getPagination({
      page: query.page,
      pageSize: query.pageSize,
    });

    const where: any = {};
    if (query.keyword) {
      where.OR = [
        { username: { contains: query.keyword } },
        { email: { contains: query.keyword } },
      ];
    }
    if (query.status === 'active') {
      where.isBlocked = false;
    } else if (query.status === 'banned') {
      where.isBlocked = true;
    }

    const [total, list] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          username: true,
          avatar: true,
          role: true,
          creditScore: true,
          isBlocked: true,
          createdAt: true,
        },
      }),
    ]);

    return PaginationUtil.buildResponse(list, total, page, pageSize);
  },

  async banUser(userId: number) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw notFound('用户不存在');
    if (user.isBlocked) throw badRequest('用户已被封禁');
    return prisma.user.update({
      where: { id: userId },
      data: { isBlocked: true, blockedUntil: null },
      select: { id: true, username: true, isBlocked: true },
    });
  },

  async unbanUser(userId: number) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw notFound('用户不存在');
    if (!user.isBlocked) throw badRequest('用户未被封禁');
    return prisma.user.update({
      where: { id: userId },
      data: { isBlocked: false, blockedUntil: null },
      select: { id: true, username: true, isBlocked: true },
    });
  },

  async setRole(userId: number, role: 'user' | 'admin') {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw notFound('用户不存在');
    if (user.role === role) throw badRequest('用户已是该角色');
    return prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, username: true, role: true },
    });
  },
};
