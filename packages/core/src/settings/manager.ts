import { TenantDb } from '../tenancy/db';

export class SettingsManager {
  static async get<T = any>(db: TenantDb, moduleId: string, key?: string): Promise<T> {
    const records = await db.findMany('core_settings', { module_id: moduleId });
    const settingsObj: Record<string, any> = {};

    for (const r of records) {
      settingsObj[r.key] = r.value;
    }

    if (key) {
      return settingsObj[key];
    }
    return settingsObj as T;
  }

  static async set(db: TenantDb, moduleId: string, key: string, value: any, userId?: string): Promise<void> {
    const existing = await db.findFirst('core_settings', { module_id: moduleId, key });

    if (existing) {
      await db.update('core_settings', existing.id, {
        value,
        updated_by: userId,
      });
    } else {
      await db.insert('core_settings', {
        module_id: moduleId,
        key,
        value,
        updated_by: userId,
      });
    }
  }
}
