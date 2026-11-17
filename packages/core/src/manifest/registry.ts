import { ModuleManifest, NavItem, RouteDef, ApiRouteDef, ModuleContext } from '../types/manifest';
import { TenantDb } from '../tenancy/db';
import { EntitlementsEngine } from '../entitlements/engine';
import { hasPermission } from '../rbac/permissions';
import { EventBus } from '../events/bus';

export class ModuleRegistry {
  private static manifests: Map<string, ModuleManifest> = new Map();

  /**
   * Register a module manifest in the global host registry
   */
  public static register(manifest: ModuleManifest): void {
    if (ModuleRegistry.manifests.has(manifest.id)) {
      throw new Error(`Module conflict: [${manifest.id}] is already registered.`);
    }

    ModuleRegistry.manifests.set(manifest.id, manifest);

    // Register event subscriptions
    if (manifest.events?.handles) {
      for (const h of manifest.events.handles) {
        EventBus.registerHandler(h.event, h.handler, {
          idempotent: h.idempotent,
          moduleId: manifest.id,
        });
      }
    }
  }

  public static get(moduleId: string): ModuleManifest | undefined {
    return ModuleRegistry.manifests.get(moduleId);
  }

  public static getAll(): ModuleManifest[] {
    return Array.from(ModuleRegistry.manifests.values());
  }

  public static clear(): void {
    ModuleRegistry.manifests.clear();
  }

  /**
   * Get active/enabled modules for a tenant
   */
  public static async getEnabledModules(db: TenantDb, tenantId: string): Promise<ModuleManifest[]> {
    const entitlements = await EntitlementsEngine.getEntitlements(db, tenantId);
    
    // Check tenant setting overrides for explicitly toggled modules
    const settingsRecord = await db.findFirst<any>('core_settings', {
      module_id: 'core',
      key: 'enabled_modules',
    });

    const activeIds: string[] = settingsRecord?.value || entitlements.enabledModules;

    const enabled: ModuleManifest[] = [];
    for (const id of activeIds) {
      const manifest = ModuleRegistry.get(id);
      if (manifest) {
        enabled.push(manifest);
      }
    }
    return enabled;
  }

  /**
   * Runtime Enable Module for a tenant
   */
  public static async enableModule(ctx: ModuleContext, moduleId: string): Promise<void> {
    const manifest = ModuleRegistry.get(moduleId);
    if (!manifest) {
      throw new Error(`Module [${moduleId}] is not installed on this host.`);
    }

    // Verify entitlements
    await EntitlementsEngine.assertModuleEntitled(ctx.db, ctx.tenantId, moduleId);

    // Verify dependencies
    if (manifest.requires && manifest.requires.length > 0) {
      const enabled = await ModuleRegistry.getEnabledModules(ctx.db, ctx.tenantId);
      const enabledIds = new Set(enabled.map((m) => m.id));

      for (const req of manifest.requires) {
        if (!enabledIds.has(req)) {
          throw new Error(`Cannot enable [${moduleId}]: Missing required module [${req}].`);
        }
      }
    }

    // Update settings table
    const existing = await ctx.db.findFirst<any>('core_settings', {
      module_id: 'core',
      key: 'enabled_modules',
    });

    const current: string[] = existing?.value || [];
    if (!current.includes(moduleId)) {
      const updated = [...current, moduleId];
      if (existing) {
        await ctx.db.update('core_settings', existing.id, { value: updated });
      } else {
        await ctx.db.insert('core_settings', {
          module_id: 'core',
          key: 'enabled_modules',
          value: updated,
        });
      }
    }

    // Trigger onEnable lifecycle hook
    if (manifest.onEnable) {
      await manifest.onEnable(ctx);
    }
  }

  /**
   * Runtime Disable Module for a tenant (retains data)
   */
  public static async disableModule(ctx: ModuleContext, moduleId: string): Promise<void> {
    const manifest = ModuleRegistry.get(moduleId);
    if (!manifest) {
      throw new Error(`Module [${moduleId}] is not registered.`);
    }

    const existing = await ctx.db.findFirst<any>('core_settings', {
      module_id: 'core',
      key: 'enabled_modules',
    });

    if (existing) {
      const updated = (existing.value as string[]).filter((id) => id !== moduleId);
      await ctx.db.update('core_settings', existing.id, { value: updated });
    }

    // Trigger onDisable lifecycle hook
    if (manifest.onDisable) {
      await manifest.onDisable(ctx);
    }
  }

  /**
   * Construct dynamic navigation sidebar based on enabled modules and user permissions
   */
  public static async getNavigation(
    db: TenantDb,
    tenantId: string,
    userPermissions: Set<string>
  ): Promise<{ group: string; items: NavItem[] }[]> {
    const enabledModules = await ModuleRegistry.getEnabledModules(db, tenantId);
    const groupsMap = new Map<string, NavItem[]>();

    for (const mod of enabledModules) {
      for (const item of mod.navigation) {
        // Permission check
        const allowed = item.requiredPermissions.every((perm) =>
          hasPermission(userPermissions, perm)
        );

        if (allowed) {
          const group = mod.group || 'operate';
          if (!groupsMap.has(group)) {
            groupsMap.set(group, []);
          }
          groupsMap.get(group)!.push({
            ...item,
            href: `/${mod.id}${item.href}`,
          });
        }
      }
    }

    return Array.from(groupsMap.entries()).map(([group, items]) => ({
      group,
      items,
    }));
  }

  /**
   * Get all active routes matching current tenant modules
   */
  public static async getRoutes(
    db: TenantDb,
    tenantId: string,
    userPermissions: Set<string>
  ): Promise<RouteDef[]> {
    const enabledModules = await ModuleRegistry.getEnabledModules(db, tenantId);
    const routes: RouteDef[] = [];

    for (const mod of enabledModules) {
      for (const route of mod.routes) {
        const allowed = route.requiredPermissions.every((perm) =>
          hasPermission(userPermissions, perm)
        );

        if (allowed) {
          routes.push({
            ...route,
            path: `/${mod.id}${route.path}`,
          });
        }
      }
    }

    return routes;
  }
}
