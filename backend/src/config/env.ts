import dotenv from 'dotenv';
dotenv.config();

/**
 * 验证必需的环境变量
 * 在启动时检查，避免运行时出现难以调试的错误
 */
function validateRequiredEnvVars(): void {
  const required = ['DATABASE_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`缺少必需的环境变量: ${missing.join(', ')}`);
  }

  // JWT secret 长度检查（建议至少 32 字符）
  const secrets = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
  for (const key of secrets) {
    const value = process.env[key]!;
    if (value.length < 32) {
      console.warn(`[WARN] ${key} 长度小于 32 字符，建议使用更长的密钥以提高安全性`);
    }
  }
}

// 启动时验证
validateRequiredEnvVars();

export const env = {
  PORT: parseInt(process.env.PORT || '3000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || '',

  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || '',
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '60m',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || '',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '30d',

  QQ_EMAIL: process.env.QQ_EMAIL || '',
  SMTP_AUTH_CODE: process.env.SMTP_AUTH_CODE || '',

  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),

  OSS_REGION: process.env.OSS_REGION || '',
  OSS_BUCKET: process.env.OSS_BUCKET || '',
  OSS_ACCESS_KEY_ID: process.env.OSS_ACCESS_KEY_ID || '',
  OSS_ACCESS_KEY_SECRET: process.env.OSS_ACCESS_KEY_SECRET || '',
  OSS_ROLE_ARN: process.env.OSS_ROLE_ARN || '',
} as const;
