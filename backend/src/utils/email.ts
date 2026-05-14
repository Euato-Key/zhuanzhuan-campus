import nodemailer from 'nodemailer';
import { env } from '../config/env';

const transporter = nodemailer.createTransport({
  host: 'smtp.qq.com',
  port: 465,
  secure: true,
  auth: {
    user: env.QQ_EMAIL,
    pass: env.SMTP_AUTH_CODE,
  },
});

export async function sendEmailCode(to: string, code: string, type: string) {
  const typeLabels: Record<string, string> = {
    register: '注册',
    login: '登录',
    reset_password: '重置密码',
    change_email: '更换邮箱',
  };

  const label = typeLabels[type] || '验证';
  const html = `
    <div style="max-width:600px;margin:0 auto;padding:20px;font-family:sans-serif;">
      <h2 style="color:#4CAF50;">转转校园</h2>
      <p>您正在进行<strong>${label}</strong>操作，验证码为：</p>
      <div style="font-size:32px;font-weight:bold;color:#4CAF50;letter-spacing:6px;margin:20px 0;">${code}</div>
      <p style="color:#999;">验证码5分钟内有效，请勿泄露给他人。</p>
      <hr style="border:none;border-top:1px solid #eee;margin:20px 0;" />
      <p style="color:#999;font-size:12px;">如非本人操作，请忽略此邮件。</p>
    </div>
  `;

  await transporter.sendMail({
    from: `"转转校园" <${env.QQ_EMAIL}>`,
    to,
    subject: `转转校园 - ${label}验证码`,
    html,
  });
}
