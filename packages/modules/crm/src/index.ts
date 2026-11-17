import { ModuleManifest, ModuleContext, ApiRequest, ApiResponse } from '@repo/core';

export const crmManifest: ModuleManifest = {
  id: 'crm',
  name: 'CRM & Deals',
  version: '1.0.0',
  description: 'Manage contacts, sales pipelines, deals, customer timelines, and segments',
  icon: 'Briefcase',
  group: 'sell',
  permissions: [
    {
      id: 'crm.view',
      name: 'View CRM',
      description: 'View contacts, companies, deals and pipelines',
      category: 'CRM',
      defaultRoles: ['Owner', 'Admin', 'Manager', 'Agent', 'Viewer'],
    },
    {
      id: 'crm.write',
      name: 'Manage CRM',
      description: 'Create and update contacts, deals and activities',
      category: 'CRM',
      defaultRoles: ['Owner', 'Admin', 'Manager', 'Agent'],
    },
    {
      id: 'crm.pipeline.admin',
      name: 'Administer Pipelines',
      description: 'Configure deal stages and pipeline settings',
      category: 'CRM',
      defaultRoles: ['Owner', 'Admin'],
    },
  ],
  navigation: [
    {
      id: 'crm-contacts',
      label: 'Contacts',
      href: '/contacts',
      icon: 'Users',
      requiredPermissions: ['crm.view'],
    },
    {
      id: 'crm-deals',
      label: 'Deals & Pipeline',
      href: '/deals',
      icon: 'TrendingUp',
      requiredPermissions: ['crm.view'],
    },
  ],
  routes: [
    { path: '/contacts', title: 'Contacts Directory', requiredPermissions: ['crm.view'] },
    { path: '/contacts/:id', title: 'Contact Profile', requiredPermissions: ['crm.view'] },
    { path: '/deals', title: 'Sales Pipeline', requiredPermissions: ['crm.view'] },
  ],
  api: [
    {
      method: 'GET',
      path: '/api/deals',
      requiredPermissions: ['crm.view'],
      handler: async (ctx: ModuleContext): Promise<ApiResponse> => {
        const deals = await ctx.db.findMany('crm_deals');
        return { status: 200, data: deals };
      },
    },
    {
      method: 'POST',
      path: '/api/deals',
      requiredPermissions: ['crm.write'],
      handler: async (ctx: ModuleContext, req: ApiRequest): Promise<ApiResponse> => {
        const deal = await ctx.db.insert('crm_deals', req.body);
        await ctx.events.emit('crm.deal.created', { dealId: deal.id, name: deal.name });
        return { status: 201, data: deal };
      },
    },
  ],
  migrations: [
    {
      version: 1,
      name: 'create_crm_tables',
      up: `
        CREATE TABLE crm_pipelines (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          stages JSONB NOT NULL DEFAULT '[]'::jsonb,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        CREATE TABLE crm_deals (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          value_cents BIGINT NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
      `,
    },
  ],
  events: {
    emits: [
      { type: 'crm.deal.created', description: 'Emitted when a new deal is opened' },
      { type: 'crm.deal.won', description: 'Emitted when a deal is closed won' },
    ],
    handles: [
      {
        event: 'mail.message.received',
        idempotent: true,
        handler: async (ctx: ModuleContext, payload: any) => {
          // Automatic contact update
          if (payload.from) {
            let contact = await ctx.db.findFirst('core_contacts', { email: payload.from });
            if (contact) {
              await ctx.db.insert('crm_activities', {
                contact_id: contact.id,
                type: 'email',
                subject: payload.subject,
                body: payload.snippet,
              });
            }
          }
        },
      },
    ],
  },
  agentTools: [
    {
      name: 'crm_createDeal',
      description: 'Create a new CRM deal for a customer',
      parameters: { name: 'string', valueCents: 'number', contactId: 'string' },
      requiredPermissions: ['crm.write'],
      riskLevel: 'write',
      defaultAutonomy: 'auto',
      execute: async (ctx: ModuleContext, args: any) => {
        return await ctx.db.insert('crm_deals', args);
      },
    },
  ],
};

export default crmManifest;
