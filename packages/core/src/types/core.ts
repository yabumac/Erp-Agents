export interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  planId: string;
  brandPackId: string;
  status: 'active' | 'suspended' | 'trial' | 'past_due';
  trialEndsAt?: string;
  settings: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  avatarUrl?: string;
  roleId: string;
  roleName?: string;
  status: 'active' | 'invited' | 'suspended';
  preferences: Record<string, any>;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Role {
  id: string;
  tenantId: string;
  name: string;
  isSystem: boolean;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Contact {
  id: string;
  tenantId: string;
  companyId?: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  source?: string;
  tags: string[];
  doNotContact: boolean;
  customFields: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface Company {
  id: string;
  tenantId: string;
  name: string;
  domain?: string;
  industry?: string;
  size?: string;
  address: Record<string, any>;
  customFields: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CoreEventRecord {
  id: string;
  tenantId: string;
  type: string;
  payload: any;
  metadata: {
    actorId?: string;
    actorType?: 'user' | 'agent' | 'system';
    traceId?: string;
  };
  idempotencyKey: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'dead';
  attempts: number;
  lastError?: string;
  createdAt: string;
  processedAt?: string;
}

export interface AuditLogEntry {
  id: string;
  tenantId: string;
  userId?: string;
  agentId?: string;
  action: string;
  entityType: string;
  entityId: string;
  beforeState?: any;
  afterState?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface Entitlements {
  tenantId: string;
  planId: string;
  maxSeats: number;
  enabledModules: string[];
  usageAllowances: {
    emailsPerMonth: number;
    callMinutesPerMonth: number;
    agentRunsPerMonth: number;
    storageBytes: number;
  };
  expiresAt?: string;
  isTrial: boolean;
}
