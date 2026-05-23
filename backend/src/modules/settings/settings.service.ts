import { prisma } from '../../config/prisma';

export interface SystemSettings {
  ai_audit_enabled: boolean;
  ai_audit_first_publish: boolean;
  ai_audit_edit: boolean;
  ai_publish_enabled: boolean;
  ai_context_window: number;
}

const DEFAULT_SETTINGS: SystemSettings = {
  ai_audit_enabled: false,
  ai_audit_first_publish: false,
  ai_audit_edit: false,
  ai_publish_enabled: false,
  ai_context_window: 5,
};

export const SettingsService = {
  /**
   * 获取所有系统配置
   */
  async get(): Promise<SystemSettings> {
    const configs = await prisma.systemConfig.findMany();
    const map: Record<string, string> = {};
    for (const c of configs) {
      map[c.key] = c.value;
    }

    return {
      ai_audit_enabled: map.ai_audit_enabled === 'true',
      ai_audit_first_publish: map.ai_audit_first_publish === 'true',
      ai_audit_edit: map.ai_audit_edit === 'true',
      ai_publish_enabled: map.ai_publish_enabled === 'true',
      ai_context_window: map.ai_context_window ? parseInt(map.ai_context_window, 10) || 5 : 5,
    };
  },

  /**
   * 获取单个配置项
   */
  async getValue(key: string): Promise<string | null> {
    const config = await prisma.systemConfig.findUnique({ where: { key } });
    return config?.value ?? null;
  },

  /**
   * 获取boolean类型配置
   */
  async getBoolean(key: string, defaultValue = false): Promise<boolean> {
    const value = await this.getValue(key);
    if (value === null) return defaultValue;
    return value === 'true';
  },

  /**
   * 更新全部配置（批量）
   */
  async setAll(data: Partial<SystemSettings>): Promise<SystemSettings> {
    const entries: Array<{ key: string; value: string }> = [];

    if (data.ai_audit_enabled !== undefined) {
      entries.push({ key: 'ai_audit_enabled', value: String(data.ai_audit_enabled) });
    }
    if (data.ai_audit_first_publish !== undefined) {
      entries.push({ key: 'ai_audit_first_publish', value: String(data.ai_audit_first_publish) });
    }
    if (data.ai_audit_edit !== undefined) {
      entries.push({ key: 'ai_audit_edit', value: String(data.ai_audit_edit) });
    }
    if (data.ai_publish_enabled !== undefined) {
      entries.push({ key: 'ai_publish_enabled', value: String(data.ai_publish_enabled) });
    }
    if (data.ai_context_window !== undefined) {
      entries.push({ key: 'ai_context_window', value: String(data.ai_context_window) });
    }

    // 批量 upsert
    await prisma.$transaction(
      entries.map(({ key, value }) =>
        prisma.systemConfig.upsert({
          where: { key },
          update: { value },
          create: { key, value },
        })
      )
    );

    return this.get();
  },

  /**
   * 确保默认配置存在
   */
  async ensureDefaults(): Promise<void> {
    const existing = await prisma.systemConfig.findMany();
    const existingKeys = new Set(existing.map(c => c.key));

    const defaults: Record<string, string> = {
      ai_audit_enabled: String(DEFAULT_SETTINGS.ai_audit_enabled),
      ai_audit_first_publish: String(DEFAULT_SETTINGS.ai_audit_first_publish),
      ai_audit_edit: String(DEFAULT_SETTINGS.ai_audit_edit),
      ai_publish_enabled: String(DEFAULT_SETTINGS.ai_publish_enabled),
      ai_context_window: String(DEFAULT_SETTINGS.ai_context_window),
    };

    const toCreate = Object.entries(defaults)
      .filter(([key]) => !existingKeys.has(key))
      .map(([key, value]) => ({ key, value }));

    if (toCreate.length > 0) {
      await prisma.systemConfig.createMany({ data: toCreate });
    }
  },
};
