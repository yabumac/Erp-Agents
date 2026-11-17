import { ModuleManifest, ModuleContext, ApiRequest, ApiResponse } from '@repo/core';

export interface NoteItem {
  id: string;
  tenant_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export const notesManifest: ModuleManifest = {
  id: 'notes',
  name: 'Internal Notes',
  version: '1.0.0',
  description: 'Team collaboration notes and quick scratchpads',
  icon: 'FileText',
  group: 'operate',
  permissions: [
    {
      id: 'notes.view',
      name: 'View Notes',
      description: 'Read internal team notes',
      category: 'General',
      defaultRoles: ['Owner', 'Admin', 'Manager', 'Agent', 'Viewer'],
    },
    {
      id: 'notes.write',
      name: 'Manage Notes',
      description: 'Create, edit, and delete internal notes',
      category: 'General',
      defaultRoles: ['Owner', 'Admin', 'Manager', 'Agent'],
    },
  ],
  navigation: [
    {
      id: 'notes-list',
      label: 'Notes',
      href: '',
      icon: 'FileText',
      requiredPermissions: ['notes.view'],
    },
  ],
  routes: [
    {
      path: '',
      title: 'Notes',
      requiredPermissions: ['notes.view'],
    },
    {
      path: '/new',
      title: 'Create Note',
      requiredPermissions: ['notes.write'],
    },
  ],
  api: [
    {
      method: 'GET',
      path: '/api/notes',
      requiredPermissions: ['notes.view'],
      handler: async (ctx: ModuleContext): Promise<ApiResponse<NoteItem[]>> => {
        const notes = await ctx.db.findMany('notes_items');
        return { status: 200, data: notes };
      },
    },
    {
      method: 'POST',
      path: '/api/notes',
      requiredPermissions: ['notes.write'],
      handler: async (ctx: ModuleContext, req: ApiRequest): Promise<ApiResponse<NoteItem>> => {
        if (!req.body?.title) {
          return { status: 400, error: 'Title is required' };
        }

        const note = await ctx.db.insert('notes_items', {
          title: req.body.title,
          content: req.body.content || '',
        });

        // Emit typed event
        await ctx.events.emit('notes.created', {
          noteId: note.id,
          title: note.title,
        });

        return { status: 201, data: note };
      },
    },
  ],
  migrations: [
    {
      version: 1,
      name: 'create_notes_items_table',
      up: `CREATE TABLE notes_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        content TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );`,
    },
  ],
  events: {
    emits: [
      {
        type: 'notes.created',
        description: 'Emitted when a new internal note is created',
      },
    ],
    handles: [],
  },
  agentTools: [
    {
      name: 'notes_search',
      description: 'Search internal team notes by title or content',
      parameters: { query: 'string' },
      requiredPermissions: ['notes.view'],
      riskLevel: 'read',
      defaultAutonomy: 'auto',
      execute: async (ctx: ModuleContext, args: { query: string }) => {
        const notes = await ctx.db.findMany('notes_items');
        const q = (args.query || '').toLowerCase();
        return notes.filter(
          (n: any) =>
            n.title?.toLowerCase().includes(q) || n.content?.toLowerCase().includes(q)
        );
      },
    },
  ],
  onEnable: async (ctx: ModuleContext) => {
    ctx.logger.info(`Module [notes] enabled for tenant [${ctx.tenantId}]`);
  },
  onDisable: async (ctx: ModuleContext) => {
    ctx.logger.info(`Module [notes] disabled for tenant [${ctx.tenantId}]`);
  },
};

export default notesManifest;
