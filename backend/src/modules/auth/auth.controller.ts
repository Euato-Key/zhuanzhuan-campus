import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { success, fail } from '../../utils/response';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/api/auth',
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

const CLEAR_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/api/auth',
  maxAge: 0,
};

export const AuthController = {
  async sendCode(req: Request, res: Response) {
    try {
      const { email, type } = req.body;
      if (!email || !type) return fail(res, '邮箱和验证码类型不能为空');
      await AuthService.sendCode(email, type);
      return success(res, null, '验证码已发送');
    } catch (err: any) {
      return fail(res, err.message, err.statusCode || 500);
    }
  },

  async register(req: Request, res: Response) {
    try {
      const { email, code, username, password } = req.body;
      if (!email || !code || !username || !password) {
        return fail(res, '请填写完整信息');
      }
      if (password.length < 6) return fail(res, '密码长度不能少于6位');
      if (username.length < 2 || username.length > 50) return fail(res, '用户名长度需在2-50之间');
      const result = await AuthService.register({ email, code, username, password });
      return success(res, result, '注册成功', 201);
    } catch (err: any) {
      return fail(res, err.message, err.statusCode || 500);
    }
  },

  async loginByEmailPassword(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      if (!email || !password) return fail(res, '邮箱和密码不能为空');
      const userAgent = req.headers['user-agent'];
      const ip = req.ip || req.socket.remoteAddress;
      const result = await AuthService.loginByEmailPassword(email, password, userAgent, ip);
      res.cookie('refresh_token', result.refresh_token, COOKIE_OPTIONS);
      return success(res, { access_token: result.access_token, user: result.user }, '登录成功');
    } catch (err: any) {
      return fail(res, err.message, err.statusCode || 500);
    }
  },

  async loginByEmailCode(req: Request, res: Response) {
    try {
      const { email, code } = req.body;
      if (!email || !code) return fail(res, '邮箱和验证码不能为空');
      const userAgent = req.headers['user-agent'];
      const ip = req.ip || req.socket.remoteAddress;
      const result = await AuthService.loginByEmailCode(email, code, userAgent, ip);
      res.cookie('refresh_token', result.refresh_token, COOKIE_OPTIONS);
      return success(res, { access_token: result.access_token, user: result.user }, '登录成功');
    } catch (err: any) {
      return fail(res, err.message, err.statusCode || 500);
    }
  },

  async refreshToken(req: Request, res: Response) {
    try {
      const oldRefreshToken = req.cookies.refresh_token;
      if (!oldRefreshToken) return fail(res, '缺少Refresh Token', 401);
      const userAgent = req.headers['user-agent'];
      const ip = req.ip || req.socket.remoteAddress;
      const result = await AuthService.refreshToken(oldRefreshToken, userAgent, ip);
      res.cookie('refresh_token', result.refresh_token, COOKIE_OPTIONS);
      return success(res, { access_token: result.access_token }, 'Token刷新成功');
    } catch (err: any) {
      res.cookie('refresh_token', '', CLEAR_COOKIE_OPTIONS);
      return fail(res, err.message, err.statusCode || 500);
    }
  },

  async logout(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const refreshToken = req.cookies.refresh_token;
      await AuthService.logout(userId, refreshToken);
      res.cookie('refresh_token', '', CLEAR_COOKIE_OPTIONS);
      return success(res, null, '已退出登录');
    } catch (err: any) {
      return fail(res, err.message, err.statusCode || 500);
    }
  },

  async resetPassword(req: Request, res: Response) {
    try {
      const { email, code, new_password } = req.body;
      if (!email || !code || !new_password) return fail(res, '请填写完整信息');
      if (new_password.length < 6) return fail(res, '密码长度不能少于6位');
      await AuthService.resetPassword(email, code, new_password);
      res.cookie('refresh_token', '', CLEAR_COOKIE_OPTIONS);
      return success(res, null, '密码重置成功');
    } catch (err: any) {
      return fail(res, err.message, err.statusCode || 500);
    }
  },

  async getProfile(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const result = await AuthService.getProfile(userId);
      return success(res, result);
    } catch (err: any) {
      return fail(res, err.message, err.statusCode || 500);
    }
  },
};