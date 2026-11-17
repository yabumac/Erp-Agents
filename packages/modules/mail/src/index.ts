import { ModuleManifest, ModuleContext, ApiRequest, ApiResponse } from '@repo/core';

export const mailManifest: ModuleManifest = {
  id: 'mail',
  name: 'Mail & Communications',
  version: '1.0.0',
  description: 'Connected inboxes, AI triage, agent drafts with approvals, and batch email campaigns',
  icon: 'Mail',
  group: 'communicate',
  permissions: [
    {
      id: 'mail.view',
      name: 'View Mail',
      description: 'Read mailboxes and threads',
      category: 'Mail',
      defaultRoles: ['Owner', 'Admin', 'Manager', 'Agent', 'Viewer'],
    },
    {
      id: 'mail.send',
      name: 'Send Mail',
      description: 'Send direct emails and replies',
      category: 'Mail',
      defaultRoles: ['Owner', 'Admin', 'Manager', 'Agent'],
    },
    {
      id: 'mail.campaign.manage',
      name: 'Manage Campaigns',
      description: 'Create and dispatch bulk email campaigns',
      category: 'Campaigns',
      defaultRoles: ['Owner', 'Admin', 'Manager'],
    },
  ],
  navigation: [
    {
      id: 'mail-inbox',
      label: 'Inbox',
      href: '',
      icon: 'Inbox',
      requiredPermissions: ['mail.view'],
    },
    {
      id: 'mail-campaigns',
      label: 'Campaigns',
      href: '/campaigns',
      icon: 'Send',
      requiredPermissions: ['mail.campaign.manage'],
    },
    {
      id: 'mail-audiences',
      label: 'Audiences',
      href: '/audiences',
      icon: 'Users',
      requiredPermissions: ['mail.campaign.manage'],
    },
  ],
  routes: [
    { path: '', title: 'Inbox', requiredPermissions: ['mail.view'] },
    { path: '/thread/:id', title: 'Conversation', requiredPermissions: ['mail.view'] },
    { path: '/campaigns', title: 'Campaigns', requiredPermissions: ['mail.campaign.manage'] },
    { path: '/audiences', title: 'Audiences', requiredPermissions: ['mail.campaign.manage'] },
  ],
  api: [
    {
      method: 'GET',
      path: '/api/threads',
      requiredPermissions: ['mail.view'],
      handler: async (ctx: ModuleContext): Promise<ApiResponse> => {
        const threads = await ctx.db.findMany('mail_threads', {}, { orderBy: 'last_message_at', orderDirection: 'desc' });
        return { status: 200, data: threads };
      },
    },
    {
      method: 'POST',
      path: '/api/send',
      requiredPermissions: ['mail.send'],
      handler: async (ctx: ModuleContext, req: ApiRequest): Promise<ApiResponse> => {
        return { status: 200, data: { queued: true } };
      },
    },
  ],
  migrations: [
    {
      version: 1,
      name: 'create_mail_tables',
      up: `
        CREATE TABLE mail_accounts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
          provider TEXT NOT NULL,
          email_address TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        CREATE TABLE mail_threads (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
          subject TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'open',
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
      `,
    },
  ],
  events: {
    emits: [
      { type: 'mail.message.received', description: 'Fired when a new email is synchronized' },
      { type: 'mail.message.sent', description: 'Fired when an email is sent' },
      { type: 'mail.campaign.completed', description: 'Fired when a batch campaign finishes' },
    ],
    handles: [],
  },
  agentTools: [
    {
      name: 'mail_sendReply',
      description: 'Send an email reply to a customer thread',
      parameters: { threadId: 'string', bodyText: 'string' },
      requiredPermissions: ['mail.send'],
      riskLevel: 'external-send',
      defaultAutonomy: 'approve',
      execute: async (ctx: ModuleContext, args: any) => {
        return { sent: true, threadId: args.threadId };
      },
    },
  ],
};

export default mailManifest;
