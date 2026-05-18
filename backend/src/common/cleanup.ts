import cron from 'node-cron';
import { prisma } from '../config/prisma';
import { FileService } from '../services/file.service';
import { TokenUtil } from './token';
import { OrderService } from '../modules/order/order.service';
import { WantBuyStatus } from '@prisma/client';

const CLEANUP_CONFIG = {
  refreshToken: { enabled: true, schedule: '0 3 * * *' },
  emailCode: { enabled: true, schedule: '0 4 * * *' },
  ossTempFiles: { enabled: true, schedule: '0 5 * * *', olderThanDays: 30 },
  expiredLocks: { enabled: true, schedule: '*/5 * * * *' },
  expiredWantBuys: { enabled: true, schedule: '0 2 * * *' },
};

async function cleanupExpiredRefreshTokens(): Promise<number> {
  const count = await TokenUtil.cleanupExpiredTokens();
  console.log(`[Cleanup] Deleted ${count} expired/revoked refresh tokens`);
  return count;
}

async function cleanupExpiredEmailCodes(): Promise<number> {
  const result = await prisma.emailCode.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: new Date() } },
        { isUsed: true },
      ],
    },
  });
  console.log(`[Cleanup] Deleted ${result.count} expired/used email codes`);
  return result.count;
}

async function cleanupAllOssTempFiles(): Promise<number> {
  const uploadTypes = Object.keys(FileService.UPLOAD_TYPES);

  const results = await Promise.allSettled(
    uploadTypes.map(type => cleanupOssTempFilesByType(type))
  );

  const totalDeleted = results
    .filter((r): r is PromiseFulfilledResult<number> => r.status === 'fulfilled')
    .reduce((sum, r) => sum + r.value, 0);

  results
    .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    .forEach((r, i) => {
      console.error(`[Cleanup] Failed to cleanup OSS temp files for type ${uploadTypes[i]}:`, r.reason);
    });

  console.log(`[Cleanup] Deleted ${totalDeleted} OSS temp files`);
  return totalDeleted;
}

async function cleanupOssTempFilesByType(type: string): Promise<number> {
  const config = FileService.UPLOAD_TYPES[type];
  if (!config) return 0;

  const olderThanDays = CLEANUP_CONFIG.ossTempFiles.olderThanDays ?? 30;
  const prefix = `${config.path}/`;
  let totalDeleted = 0;
  let marker: string | undefined;

  do {
    const result = await listOssObjects(prefix, marker);
    if (!result.objects || result.objects.length === 0) break;

    const cutoffTime = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
    const objectsToDelete = result.objects.filter((obj: { name: string }) => {
      if (!obj.name.includes('/temp/')) return false;
      const filename = obj.name.split('/').pop() || '';
      const timestampStr = filename.split('_')[0];
      const timestamp = parseInt(timestampStr, 10);
      return timestamp && timestamp < cutoffTime;
    });

    if (objectsToDelete.length > 0) {
      await deleteOssObjects(objectsToDelete.map((obj: { name: string }) => obj.name));
      totalDeleted += objectsToDelete.length;
    }

    marker = result.nextMarker;
  } while (marker);

  return totalDeleted;
}

async function listOssObjects(prefix: string, marker?: string): Promise<any> {
  const client = FileService.getOSSClient();
  return client.list({ prefix, 'max-keys': 1000, marker }, {});
}

async function deleteOssObjects(names: string[]): Promise<void> {
  const client = FileService.getOSSClient();
  await client.deleteMulti(names, {});
}

async function cleanupExpiredWantBuys(): Promise<number> {
  const result = await prisma.wantBuy.updateMany({
    where: {
      status: WantBuyStatus.active,
      expireTime: { lt: new Date() },
    },
    data: {
      status: WantBuyStatus.expired,
    },
  });
  console.log(`[Cleanup] Marked ${result.count} want-buys as expired`);
  return result.count;
}

export function startCleanupJobs() {
  if (CLEANUP_CONFIG.refreshToken.enabled) {
    cron.schedule(CLEANUP_CONFIG.refreshToken.schedule, async () => {
      try {
        await cleanupExpiredRefreshTokens();
      } catch (error) {
        console.error('[Cleanup] Failed to cleanup refresh tokens:', error);
      }
    });
    console.log('[Cleanup] Refresh token cleanup job scheduled');
  }

  if (CLEANUP_CONFIG.emailCode.enabled) {
    cron.schedule(CLEANUP_CONFIG.emailCode.schedule, async () => {
      try {
        await cleanupExpiredEmailCodes();
      } catch (error) {
        console.error('[Cleanup] Failed to cleanup email codes:', error);
      }
    });
    console.log('[Cleanup] Email code cleanup job scheduled');
  }

  if (CLEANUP_CONFIG.ossTempFiles.enabled) {
    cron.schedule(CLEANUP_CONFIG.ossTempFiles.schedule, async () => {
      try {
        await cleanupAllOssTempFiles();
      } catch (error) {
        console.error('[Cleanup] Failed to cleanup OSS temp files:', error);
      }
    });
    console.log('[Cleanup] OSS temp files cleanup job scheduled');
  }

  if (CLEANUP_CONFIG.expiredLocks.enabled) {
    cron.schedule(CLEANUP_CONFIG.expiredLocks.schedule, async () => {
      try {
        const count = await OrderService.cleanExpiredLocks();
        console.log(`[Cleanup] Cleaned ${count} expired product locks`);
      } catch (error) {
        console.error('[Cleanup] Failed to cleanup expired locks:', error);
      }
    });
    console.log('[Cleanup] Expired product lock cleanup job scheduled');
  }

  if (CLEANUP_CONFIG.expiredWantBuys.enabled) {
    cron.schedule(CLEANUP_CONFIG.expiredWantBuys.schedule, async () => {
      try {
        await cleanupExpiredWantBuys();
      } catch (error) {
        console.error('[Cleanup] Failed to cleanup expired want-buys:', error);
      }
    });
    console.log('[Cleanup] Expired want-buys cleanup job scheduled');
  }
}

export const CleanupService = {
  cleanupExpiredRefreshTokens,
  cleanupExpiredEmailCodes,
  cleanupAllOssTempFiles,
  cleanupExpiredWantBuys,
};
