import { User, Tenant } from '../types/core';

export interface TenantContext {
  tenantId: string;
  tenant?: Tenant;
  userId?: string;
  user?: User;
  userRole?: string;
  permissions: Set<string>;
  traceId: string;
}

export function createTenantContext(options: {
  tenantId: string;
  tenant?: Tenant;
  userId?: string;
  user?: User;
  userRole?: string;
  permissions?: string[];
  traceId?: string;
}): TenantContext {
  if (!options.tenantId) {
    throw new Error('TenantContext requires a valid tenantId');
  }

  return {
    tenantId: options.tenantId,
    tenant: options.tenant,
    userId: options.userId,
    user: options.user,
    userRole: options.userRole || 'Viewer',
    permissions: new Set(options.permissions || []),
    traceId: options.traceId || `trc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
  };
}

export function assertTenantAccess(ctx: TenantContext, targetTenantId: string): void {
  if (ctx.tenantId !== targetTenantId) {
    throw new Error(`Security Violation: Cross-tenant access denied. Context: ${ctx.tenantId}, Target: ${targetTenantId}`);
  }
}
