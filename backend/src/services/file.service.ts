import OSS from 'ali-oss';
import { env } from '../config/env';
import { badRequest, forbidden } from '../common/errors';

// 文件上传配置常量
const MAX_AVATAR_SIZE_MB = 2;
const MAX_IMAGE_SIZE_MB = 5;
const MAX_AVATAR_COUNT = 1;
const MAX_PRODUCT_IMAGE_COUNT = 9;
const SIGNED_URL_EXPIRES_SECONDS = 900;
const STS_CREDENTIAL_EXPIRES_SECONDS = 3600;

const MB = 1024 * 1024;

interface UploadTypeConfig {
  path: string;
  maxSize: number;
  maxCount: number;
  allowedMime: string[];
  allowedExt: string[];
}

const UPLOAD_TYPES: Record<string, UploadTypeConfig> = {
  avatar: {
    path: 'avatars',
    maxSize: MAX_AVATAR_SIZE_MB * MB,
    maxCount: MAX_AVATAR_COUNT,
    allowedMime: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    allowedExt: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  },
  product: {
    path: 'products',
    maxSize: MAX_IMAGE_SIZE_MB * MB,
    maxCount: MAX_PRODUCT_IMAGE_COUNT,
    allowedMime: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    allowedExt: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  },
  community: {
    path: 'community',
    maxSize: MAX_IMAGE_SIZE_MB * MB,
    maxCount: MAX_PRODUCT_IMAGE_COUNT,
    allowedMime: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    allowedExt: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  },
  chat: {
    path: 'chat',
    maxSize: MAX_IMAGE_SIZE_MB * MB,
    maxCount: MAX_AVATAR_COUNT,
    allowedMime: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    allowedExt: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  },
};

const MIME_MAP: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

let ossClient: OSS | null = null;
let stsClient: OSS.STS | null = null;

function getOSSClient(): OSS {
  if (!ossClient) {
    ossClient = new OSS({
      region: env.OSS_REGION,
      accessKeyId: env.OSS_ACCESS_KEY_ID,
      accessKeySecret: env.OSS_ACCESS_KEY_SECRET,
      bucket: env.OSS_BUCKET,
      secure: true,
    });
  }
  return ossClient;
}

function getSTSClient(): OSS.STS {
  if (!stsClient) {
    stsClient = new OSS.STS({
      accessKeyId: env.OSS_ACCESS_KEY_ID,
      accessKeySecret: env.OSS_ACCESS_KEY_SECRET,
    });
  }
  return stsClient;
}

function getExtFromFilename(filename: string): string {
  const dotIndex = filename.lastIndexOf('.');
  if (dotIndex === -1) return '';
  return filename.substring(dotIndex).toLowerCase();
}

function generateTempPath(type: string, userId: number, ext: string): string {
  const config = UPLOAD_TYPES[type];
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${config.path}/${userId}/temp/${timestamp}_${random}${ext}`;
}

function generatePermanentPath(type: string, userId: number, ext: string): string {
  const config = UPLOAD_TYPES[type];
  const now = new Date();
  const datePath = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${config.path}/${userId}/${datePath}/${timestamp}_${random}${ext}`;
}

function validateTempPath(tempPath: string, type: string, userId: number): void {
  const config = UPLOAD_TYPES[type];
  const expectedPrefix = `${config.path}/${userId}/temp/`;
  if (!tempPath.startsWith(expectedPrefix)) {
    throw forbidden('临时文件路径不属于当前用户');
  }
  if (tempPath.includes('..') || tempPath.includes('//') || !/^[\w/.-]+$/.test(tempPath)) {
    throw badRequest('非法的文件路径');
  }
}

async function getSTSCredentials(type: string, userId: number) {
  const config = UPLOAD_TYPES[type];
  if (!config) throw badRequest('不支持的上传类型');

  const roleArn = env.OSS_ROLE_ARN;
  const uploadPath = `${config.path}/${userId}/temp/`;

  const policy = {
    Version: '1',
    Statement: [
      {
        Effect: 'Allow',
        Action: ['oss:PutObject'],
        Resource: [`acs:oss:*:*:${env.OSS_BUCKET}/${config.path}/${userId}/temp/*`],
      },
    ],
  };

  if (!roleArn) {
    console.warn('[OSS] OSS_ROLE_ARN not configured. Using simplified mode with main credentials. DO NOT use in production!');
    return {
      accessKeyId: env.OSS_ACCESS_KEY_ID,
      accessKeySecret: env.OSS_ACCESS_KEY_SECRET,
      securityToken: '',
      expiration: new Date(Date.now() + STS_CREDENTIAL_EXPIRES_SECONDS * 1000).toISOString(),
      region: env.OSS_REGION,
      bucket: env.OSS_BUCKET,
      uploadPath,
      uploadConfig: {
        path: config.path,
        maxSize: config.maxSize,
        maxCount: config.maxCount,
        allowedMime: config.allowedMime,
        allowedExt: config.allowedExt,
      },
    };
  }

  const sts = getSTSClient();
  const sessionName = `zz-campus-${type}-${userId}`;
  const result = await sts.assumeRole(roleArn, policy, STS_CREDENTIAL_EXPIRES_SECONDS, sessionName);
  const credentials = result.credentials;

  return {
    accessKeyId: credentials.AccessKeyId,
    accessKeySecret: credentials.AccessKeySecret,
    securityToken: credentials.SecurityToken,
    expiration: credentials.Expiration,
    region: env.OSS_REGION,
    bucket: env.OSS_BUCKET,
    uploadPath,
    uploadConfig: {
      path: config.path,
      maxSize: config.maxSize,
      maxCount: config.maxCount,
      allowedMime: config.allowedMime,
      allowedExt: config.allowedExt,
    },
  };
}

async function getSignedUrl(type: string, userId: number, filename: string) {
  const config = UPLOAD_TYPES[type];
  if (!config) throw badRequest('不支持的上传类型');

  const ext = getExtFromFilename(filename);
  if (!ext || !config.allowedExt.includes(ext)) {
    throw badRequest('不支持的文件扩展名');
  }

  const ossPath = generateTempPath(type, userId, ext);
  const client = getOSSClient();

  const url = client.signatureUrl(ossPath, {
    method: 'PUT',
    expires: SIGNED_URL_EXPIRES_SECONDS,
    'Content-Type': MIME_MAP[ext] || 'application/octet-stream',
  });

  return {
    url,
    ossPath,
    expires: SIGNED_URL_EXPIRES_SECONDS,
    uploadConfig: {
      maxSize: config.maxSize,
      maxCount: config.maxCount,
      allowedMime: config.allowedMime,
      allowedExt: config.allowedExt,
    },
  };
}

async function moveFileToPermanent(tempPath: string, type: string, userId: number): Promise<string> {
  validateTempPath(tempPath, type, userId);

  const ext = tempPath.substring(tempPath.lastIndexOf('.'));
  const permanentPath = generatePermanentPath(type, userId, ext);
  const client = getOSSClient();

  // Copy from temp to permanent - source must be in format /bucket/objectKey
  const source = `/${env.OSS_BUCKET}/${tempPath}`;
  await client.copy(permanentPath, source);

  try {
    await client.delete(tempPath);
  } catch {
    console.warn(`[OSS] Failed to delete temp file: ${tempPath}`);
  }

  return permanentPath;
}

async function cleanupTempFiles(type: string, userId: number, olderThanDays = 30): Promise<number> {
  const config = UPLOAD_TYPES[type];
  const prefix = `${config.path}/${userId}/temp/`;
  const client = getOSSClient();
  const cutoffTime = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;

  const result = await client.list({ prefix, 'max-keys': 1000 }, {});
  const objectsToDelete = result.objects?.filter(obj => {
    const filename = obj.name.split('/').pop() || '';
    const timestampStr = filename.split('_')[0];
    const timestamp = parseInt(timestampStr, 10);
    return timestamp < cutoffTime;
  }) || [];

  if (objectsToDelete.length === 0) return 0;

  await client.deleteMulti(objectsToDelete.map(obj => obj.name));
  return objectsToDelete.length;
}

export const FileService = {
  getOSSClient,
  getSTSCredentials,
  getSignedUrl,
  moveFileToPermanent,
  cleanupTempFiles,
  generateTempPath,
  generatePermanentPath,
  UPLOAD_TYPES,
};