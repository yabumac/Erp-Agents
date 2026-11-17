import { TenantContext } from '../tenancy/context';

export const SYSTEM_ROLES = {
  Owner: {
    name: 'Owner',
    description: 'Workspace owner with unrestricted administrative and billing privileges',
    permissions: ['*'],
  },
  Admin: {
    name: 'Admin',
    description: 'System administrator with full data access and module management',
    permissions: [
      'core.*',
      'mail.*',
      'voice.*',
      'crm.*',
      'inv.*',
      'fin.*',
      'kb.*',
      'auto.*',
      'agent.*',
    ],
  },
  Manager: {
    name: 'Manager',
    description: 'Operational team lead capable of approving agent actions and reviewing reports',
    permissions: [
      'core.users.view',
      'mail.view',
      'mail.send',
      'mail.campaign.manage',
      'voice.view',
      'voice.call',
      'crm.view',
      'crm.manage',
      'inv.view',
      'inv.manage',
      'fin.view',
      'fin.manage',
      'agent.approve',
    ],
  },
  Agent: {
    name: 'Agent',
    description: 'Day-to-day team member handling customer conversations, deals, and records',
    permissions: [
      'mail.view',
      'mail.send',
      'voice.view',
      'voice.call',
      'crm.view',
      'crm.write',
      'inv.view',
      'fin.view',
      'agent.suggest',
    ],
  },
  Viewer: {
    name: 'Viewer',
    description: 'Read-only access across enabled modules',
    permissions: [
      'mail.view',
      'voice.view',
      'crm.view',
      'inv.view',
      'fin.view',
    ],
  },
};

export function hasPermission(userPermissions: Set<string> | string[], required: string): boolean {
  const perms = userPermissions instanceof Set ? userPermissions : new Set(userPermissions);

  // Global wildcard
  if (perms.has('*')) {
    return true;
  }

  // Exact match
  if (perms.has(required)) {
    return true;
  }

  // Namespace wildcard: e.g. "mail.*" matches "mail.campaign.send"
  const parts = required.split('.');
  if (parts.length > 1) {
    const namespaceWildcard = `${parts[0]}.*`;
    if (perms.has(namespaceWildcard)) {
      return true;
    }
  }

  return false;
}

export function assertPermission(ctx: TenantContext, required: string): void {
  if (!hasPermission(ctx.permissions, required)) {
    throw new Error(`Forbidden: User does not possess required permission [${required}]`);
  }
}
