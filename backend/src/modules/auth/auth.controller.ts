import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { success, fail } from '../../utils/response';
import { asyncHandler } from '../../common/asyncHandler';
import { ValidationUtil } from '../../common/validation';

const REFRESH_TOKEN_MAX_AGE_DAYS = 30;

const getCookieOptions = (maxAge: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/api/auth',
  maxAge,
});

const COOKIE_OPTIONS = getCookieOptions(REFRESH_TOKEN_MAX_AGE_DAYS * 24 * 60 * 60 * 1000);
const CLEAR_COOKIE_OPTIONS = getCookieOptions(0);

export const AuthController = {
  sendCode: asyncHandler(async (req: Request, res: Response) => {
    const { email, type } = req.body;
    if (!email || !type) return fail(res, '邮箱和验证码类型不能为空');
    await AuthService.sendCode(email, type);
    return success(res, null, '验证码已发送');
  }),

  register: asyncHandler(async (req: Request, res: Response) => {
    const { email, code, username, password } = req.body;
    if (!email || !code || !username || !password) {
      return fail(res, '请填写完整信息');
    }
    ValidationUtil.validateUsername(username);
    const result = await AuthService.register({ email, code, username, password });
    return success(res, result, '注册成功', 201);
  }),

  loginByEmailPassword: asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;
    if (!email || !password) return fail(res, '邮箱和密码不能为空');
    const { userAgent, ip } = ValidationUtil.getRequestMeta(req);
    const result = await AuthService.loginByEmailPassword(email, password, userAgent, ip);
    res.cookie('refresh_token', result.refresh_token, COOKIE_OPTIONS);
    return success(res, { access_token: result.access_token, user: result.user }, '登录成功');
  }),

  loginByEmailCode: asyncHandler(async (req: Request, res: Response) => {
    const { email, code } = req.body;
    if (!email || !code) return fail(res, '邮箱和验证码不能为空');
    const { userAgent, ip } = ValidationUtil.getRequestMeta(req);
    const result = await AuthService.loginByEmailCode(email, code, userAgent, ip);
    res.cookie('refresh_token', result.refresh_token, COOKIE_OPTIONS);
    return success(res, { access_token: result.access_token, user: result.user }, '登录成功');
  }),

  refreshToken: asyncHandler(async (req: Request, res: Response) => {
    const oldRefreshToken = req.cookies.refresh_token;
    if (!oldRefreshToken) return fail(res, '缺少Refresh Token', 401);
    const { userAgent, ip } = ValidationUtil.getRequestMeta(req);
    const result = await AuthService.refreshToken(oldRefreshToken, userAgent, ip);
    res.cookie('refresh_token', result.refresh_token, COOKIE_OPTIONS);
    return success(res, { access_token: result.access_token }, 'Token刷新成功');
  }),

  logout: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const refreshToken = req.cookies.refresh_token;
    await AuthService.logout(userId, refreshToken);
    res.cookie('refresh_token', '', CLEAR_COOKIE_OPTIONS);
    return success(res, null, '已退出登录');
  }),

  resetPassword: asyncHandler(async (req: Request, res: Response) => {
    const { email, code, new_password } = req.body;
    if (!email || !code || !new_password) return fail(res, '请填写完整信息');
    await AuthService.resetPassword(email, code, new_password);
    res.cookie('refresh_token', '', CLEAR_COOKIE_OPTIONS);
    return success(res, null, '密码重置成功');
  }),

  getProfile: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const result = await AuthService.getProfile(userId);
    return success(res, result);
  }),
};
