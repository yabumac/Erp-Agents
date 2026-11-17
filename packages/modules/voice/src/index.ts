import { ModuleManifest, ModuleContext, ApiRequest, ApiResponse } from '@repo/core';

export const voiceManifest: ModuleManifest = {
  id: 'voice',
  name: 'AI Voice & Telephony',
  version: '1.0.0',
  description: 'AI phone agent with realtime conversational pipeline, call flows, and compliance center',
  icon: 'Phone',
  group: 'communicate',
  permissions: [
    {
      id: 'voice.view',
      name: 'View Voice Calls',
      description: 'View call logs, transcripts, and recordings',
      category: 'Voice',
      defaultRoles: ['Owner', 'Admin', 'Manager', 'Agent', 'Viewer'],
    },
    {
      id: 'voice.call',
      name: 'Initiate Calls',
      description: 'Place outbound calls and launch campaigns',
      category: 'Voice',
      defaultRoles: ['Owner', 'Admin', 'Manager'],
    },
    {
      id: 'voice.admin',
      name: 'Administer Telephony',
      description: 'Manage phone numbers and configure compliance rules',
      category: 'Voice',
      defaultRoles: ['Owner', 'Admin'],
    },
  ],
  navigation: [
    {
      id: 'voice-calls',
      label: 'Call Log',
      href: '',
      icon: 'PhoneCall',
      requiredPermissions: ['voice.view'],
    },
    {
      id: 'voice-flows',
      label: 'Flow Builder',
      href: '/flows',
      icon: 'GitFork',
      requiredPermissions: ['voice.admin'],
    },
    {
      id: 'voice-compliance',
      label: 'Compliance Center',
      href: '/compliance',
      icon: 'ShieldCheck',
      requiredPermissions: ['voice.admin'],
    },
  ],
  routes: [
    { path: '', title: 'Call Log', requiredPermissions: ['voice.view'] },
    { path: '/calls/:id', title: 'Call Detail & Transcript', requiredPermissions: ['voice.view'] },
    { path: '/flows', title: 'Voice Flow Canvas', requiredPermissions: ['voice.admin'] },
    { path: '/compliance', title: 'Telephony Compliance', requiredPermissions: ['voice.admin'] },
  ],
  api: [
    {
      method: 'GET',
      path: '/api/calls',
      requiredPermissions: ['voice.view'],
      handler: async (ctx: ModuleContext): Promise<ApiResponse> => {
        const calls = await ctx.db.findMany('voice_calls');
        return { status: 200, data: calls };
      },
    },
  ],
  migrations: [
    {
      version: 1,
      name: 'create_voice_tables',
      up: `
        CREATE TABLE voice_calls (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
          from_number TEXT NOT NULL,
          to_number TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'completed',
          transcript TEXT NOT NULL DEFAULT '',
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
      `,
    },
  ],
  events: {
    emits: [
      { type: 'voice.call.completed', description: 'Emitted when a voice call finishes' },
    ],
    handles: [],
  },
  agentTools: [
    {
      name: 'voice_transferCall',
      description: 'Transfer active caller to human operator',
      parameters: { callId: 'string', reason: 'string' },
      requiredPermissions: ['voice.call'],
      riskLevel: 'write',
      defaultAutonomy: 'auto',
      execute: async (ctx: ModuleContext, args: any) => {
        return { transferred: true, target: 'human_operator' };
      },
    },
  ],
};

export default voiceManifest;
