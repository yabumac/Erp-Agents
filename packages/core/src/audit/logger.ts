import { TenantContext } from '../tenancy/context';
import { AuditLogEntry } from '../types/core';

export async function logAudit(
  ctx: TenantContext | { tenantId: string; userId?: string; db: any },
  entry: {
    action: string;
    entityType: string;
    entityId: string;
    agentId?: string;
    beforeState?: any;
    afterState?: any;
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<AuditLogEntry> {
  const record: AuditLogEntry = {
    id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    tenantId: ctx.tenantId,
    userId: (ctx as any).userId,
    agentId: entry.agentId,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    beforeState: entry.beforeState,
    afterState: entry.afterState,
    ipAddress: entry.ipAddress,
    userAgent: entry.userAgent,
    createdAt: new Date().toISOString(),
  };

  await (ctx as any).db.insert('core_audit_log', record);
  return record;
}
