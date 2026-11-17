import { TenantDb } from '../tenancy/db';
import { Entitlements } from '../types/core';

export const PLANS: Record<string, Partial<Entitlements>> = {
  starter: {
    planId: 'starter',
    maxSeats: 5,
    enabledModules: ['mail', 'crm'],
    usageAllowances: {
      emailsPerMonth: 5000,
      callMinutesPerMonth: 0,
      agentRunsPerMonth: 500,
      storageBytes: 5 * 1024 * 1024 * 1024, // 5GB
    },
    isTrial: false,
  },
  professional: {
    planId: 'professional',
    maxSeats: 25,
    enabledModules: ['mail', 'crm', 'voice', 'inventory', 'invoicing', 'knowledge', 'automations', 'notes'],
    usageAllowances: {
      emailsPerMonth: 50000,
      callMinutesPerMonth: 1000,
      agentRunsPerMonth: 10000,
      storageBytes: 50 * 1024 * 1024 * 1024, // 50GB
    },
    isTrial: false,
  },
  enterprise: {
    planId: 'enterprise',
    maxSeats: 500,
    enabledModules: [
      'mail',
      'voice',
      'crm',
      'inventory',
      'invoicing',
      'knowledge',
      'automations',
      'notes',
    ],
    usageAllowances: {
      emailsPerMonth: 1000000,
      callMinutesPerMonth: 25000,
      agentRunsPerMonth: 250000,
      storageBytes: 1024 * 1024 * 1024 * 1024, // 1TB
    },
    isTrial: false,
  },
};

export class EntitlementsEngine {
  static async getEntitlements(db: TenantDb, tenantId: string): Promise<Entitlements> {
    const record = await db.findFirst<any>('core_entitlements', { tenant_id: tenantId });
    if (record) {
      return {
        tenantId,
        planId: record.plan_id,
        maxSeats: record.max_seats,
        enabledModules: record.enabled_modules || [],
        usageAllowances: record.usage_allowances || {
          emailsPerMonth: 10000,
          callMinutesPerMonth: 100,
          agentRunsPerMonth: 1000,
          storageBytes: 10 * 1024 * 1024 * 1024,
        },
        expiresAt: record.expires_at,
        isTrial: Boolean(record.is_trial),
      };
    }

    // Default fallback to professional plan for testing/evaluation
    const plan = PLANS.professional;
    return {
      tenantId,
      planId: plan.planId!,
      maxSeats: plan.maxSeats!,
      enabledModules: plan.enabledModules!,
      usageAllowances: plan.usageAllowances as any,
      isTrial: false,
    };
  }

  static async assertModuleEntitled(db: TenantDb, tenantId: string, moduleId: string): Promise<void> {
    const entitlements = await EntitlementsEngine.getEntitlements(db, tenantId);
    if (!entitlements.enabledModules.includes(moduleId) && !entitlements.enabledModules.includes('*')) {
      throw new Error(`Entitlement Exception: Module [${moduleId}] is not enabled for tenant [${tenantId}] under plan [${entitlements.planId}].`);
    }
  }

  static async assertSeatAvailable(db: TenantDb, tenantId: string): Promise<void> {
    const entitlements = await EntitlementsEngine.getEntitlements(db, tenantId);
    const activeSeats = await db.count('core_users', { status: 'active' });

    if (activeSeats >= entitlements.maxSeats) {
      throw new Error(`Entitlement Exception: Seat limit of ${entitlements.maxSeats} reached for tenant [${tenantId}].`);
    }
  }
}
