import { ModuleManifest, ModuleContext, ApiRequest, ApiResponse } from '@repo/core';

export const automationsManifest: ModuleManifest = {
  id: 'automations',
  name: 'Visual Workflows & Automations',
  version: '1.0.0',
  description: 'Design visual trigger, condition, and action automations across modules',
  icon: 'Zap',
  group: 'insights',
  permissions: [
    {
      id: 'automations.view',
      name: 'View Automations',
      description: 'View active automations and execution logs',
      category: 'Automations',
      defaultRoles: ['Owner', 'Admin', 'Manager'],
    },
    {
      id: 'automations.manage',
      name: 'Manage Automations',
      description: 'Create and edit workflow definitions',
      category: 'Automations',
      defaultRoles: ['Owner', 'Admin'],
    },
  ],
  navigation: [
    {
      id: 'automations-list',
      label: 'Automations',
      href: '',
      icon: 'Zap',
      requiredPermissions: ['automations.view'],
    },
  ],
  routes: [
    { path: '', title: 'Workflow Directory', requiredPermissions: ['automations.view'] },
    { path: '/builder/:id', title: 'Workflow Canvas', requiredPermissions: ['automations.manage'] },
  ],
  api: [
    {
      method: 'GET',
      path: '/api/workflows',
      requiredPermissions: ['automations.view'],
      handler: async (ctx: ModuleContext): Promise<ApiResponse> => {
        const workflows = await ctx.db.findMany('auto_workflows');
        return { status: 200, data: workflows };
      },
    },
  ],
  migrations: [
    {
      version: 1,
      name: 'create_automations_tables',
      up: `
        CREATE TABLE auto_workflows (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          trigger_event TEXT NOT NULL,
          steps JSONB NOT NULL DEFAULT '[]'::jsonb,
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
      `,
    },
  ],
  events: {
    emits: [
      { type: 'automations.workflow.completed', description: 'Emitted when a workflow run finishes' },
    ],
    handles: [],
  },
};

export default automationsManifest;
