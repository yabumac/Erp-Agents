# Module Contract Specification

The Architectural Standard for Extensible, Independent Modules

---

## 1. Overview

The module contract is the heart of the business operating system. Every domain capability (Mail, Voice, CRM, Inventory, Invoicing, Knowledge, Automations) is implemented as a standalone package inside `packages/modules/<module-id>` that exports a single compliant `ModuleManifest`.

The host runtime (`apps/web` and `apps/worker`) discovers, mounts, enables, disables, and executes modules exclusively through this contract. **Modules never import each other directly.**

---

## 2. The `ModuleManifest` Interface

```typescript
import { z } from 'zod';

export type ModuleGroup =
  | 'communicate' // Mail, Messaging, Voice
  | 'sell'        // CRM, Calendar/Booking
  | 'operate'     // Inventory, Projects/Tasks, HR-lite
  | 'finance'     // Invoicing, Accounting-lite, Sales/Purchasing
  | 'insights'    // Analytics, Automations
  | 'admin';      // Core administration, Settings

export type RiskLevel = 'read' | 'write' | 'external-send' | 'financial';
export type AutonomyLevel = 'suggest' | 'approve' | 'auto';

export interface PermissionDef {
  id: string; // Namespaced: e.g. "mail.campaign.send", "inv.stock.adjust"
  name: string;
  description: string;
  category: string;
  defaultRoles: ('Owner' | 'Admin' | 'Manager' | 'Agent' | 'Viewer')[];
}

export interface NavItem {
  id: string;
  label: string;
  href: string; // Relative to module root, e.g. "/inbox", "/campaigns"
  icon: string; // Lucide icon identifier
  requiredPermissions: string[];
  badgeCountProvider?: string; // Identifier of query provider returning number badge
}

export interface RouteDef {
  path: string; // e.g. "/inbox", "/thread/[id]", "/campaigns/new"
  componentPath: string; // Lazy-loaded page component
  title: string;
  requiredPermissions: string[];
  layout?: 'default' | 'fullscreen' | 'canvas';
}

export interface ApiRouteDef {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string; // e.g. "/api/messages", "/api/campaigns/:id/send"
  handler: string; // Exported handler function
  requiredPermissions: string[];
  rateLimit?: {
    windowMs: number;
    maxRequests: number;
  };
  inputSchema?: z.ZodTypeAny;
  outputSchema?: z.ZodTypeAny;
}

export interface WidgetDef {
  id: string;
  name: string;
  description: string;
  size: 'small' | 'medium' | 'large' | 'full';
  componentPath: string;
  requiredPermissions: string[];
  refreshIntervalSeconds?: number;
}

export interface MigrationDef {
  version: number; // Monotonically increasing integer
  name: string;
  up: string; // SQL or file path
  down?: string;
}

export interface EventDef {
  type: string; // Namespaced: e.g. "mail.message.received"
  description: string;
  payloadSchema: z.ZodTypeAny;
}

export interface EventHandlerDef {
  event: string; // Event type being listened to
  handler: (ctx: ModuleContext, payload: any) => Promise<void>;
  idempotent: boolean;
  retryLimit?: number;
}

export interface JobDef {
  id: string; // e.g. "mail-sync-incremental", "inv-reorder-check"
  cron?: string; // Optional cron expression for recurring tasks
  handler: (ctx: ModuleContext, payload?: any) => Promise<void>;
  concurrency?: number;
}

export interface AgentToolDef {
  name: string; // e.g. "mail_sendReply", "inv_checkStock"
  description: string;
  parameters: z.ZodTypeAny;
  requiredPermissions: string[];
  riskLevel: RiskLevel;
  defaultAutonomy: AutonomyLevel;
  execute: (ctx: ModuleContext, args: any) => Promise<any>;
}

export interface SearchProviderDef {
  id: string;
  entityName: string;
  search: (
    ctx: ModuleContext,
    query: string,
    limit: number
  ) => Promise<{
    id: string;
    title: string;
    subtitle?: string;
    href: string;
    type: string;
  }[]>;
}

export interface SeedDef {
  seed: (ctx: ModuleContext) => Promise<void>;
}

export interface ModuleContext {
  tenantId: string;
  userId?: string;
  db: any; // Scoped Drizzle database client with RLS active
  events: {
    emit: (type: string, payload: any, options?: { idempotencyKey?: string }) => Promise<void>;
  };
  jobs: {
    enqueue: (jobId: string, payload: any, options?: any) => Promise<string>;
  };
  storage: {
    upload: (key: string, data: Buffer, mimeType: string) => Promise<string>;
    getDownloadUrl: (key: string, expiresInSeconds?: number) => Promise<string>;
  };
  settings: Record<string, any>;
  integrations: {
    isAvailable: (moduleId: string) => boolean;
  };
  logger: {
    info: (msg: string, meta?: any) => void;
    warn: (msg: string, meta?: any) => void;
    error: (msg: string, err?: any) => void;
  };
}

export interface ModuleManifest {
  id: string;                         // Unique ID: e.g. "mail", "voice", "inventory"
  name: string;                       // Display name
  version: string;                    // Semantic versioning (e.g. "1.0.0")
  description: string;
  icon: string;                       // Lucide icon name
  group: ModuleGroup;
  requires?: string[];                // Mandatory module IDs
  optionalIntegrations?: string[];    // Modules enhanced if present
  permissions: PermissionDef[];
  navigation: NavItem[];
  routes: RouteDef[];
  api: ApiRouteDef[];
  dashboardWidgets?: WidgetDef[];
  settingsSchema: z.ZodObject<any>;
  migrations: MigrationDef[];
  events: {
    emits: EventDef[];
    handles: EventHandlerDef[];
  };
  jobs?: JobDef[];
  agentTools?: AgentToolDef[];
  searchProviders?: SearchProviderDef[];
  seed?: SeedDef;
  onEnable?: (ctx: ModuleContext) => Promise<void>;
  onDisable?: (ctx: ModuleContext) => Promise<void>;
  onUninstall?: (ctx: ModuleContext) => Promise<void>;
}
```

---

## 3. Strict Architectural Rules

1. **Isolation from Peer Modules:** Modules never import from another module directory (`import ... from '@repo/module-crm'` inside `module-mail` fails lint and CI checks).
2. **Table Prefixing:** Every table created by a module must be prefixed with the module identifier:
   - Mail: `mail_`
   - Voice: `voice_`
   - CRM: `crm_`
   - Inventory: `inv_`
   - Invoicing: `fin_`
   - Knowledge: `kb_`
   - Automations: `auto_`
3. **Multi-Tenancy Column:** Every table must have `tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE`.
4. **Runtime Activation:** Enabling or disabling a module is a zero-downtime, runtime operation per tenant. Disabling a module:
   - Removes it from the sidebar navigation.
   - Returns `404 Not Found` on module web and API routes.
   - Pauses module background jobs.
   - Unregisters module agent tools.
   - **Retains all database records intact.**
5. **Entitlements First:** The host verifies tenant plan entitlements before enabling any module.

---

## 4. Cross-Module Communication Patterns

### Pattern A: Asynchronous Events (Decoupled)
```typescript
// Inside packages/modules/mail/src/services/receive.ts
await ctx.events.emit('mail.message.received', {
  threadId: thread.id,
  fromEmail: message.from,
  subject: message.subject,
  bodySnippet: message.snippet,
});

// Inside packages/modules/crm/src/events/mail-handlers.ts
export const handleMailReceived: EventHandlerDef = {
  event: 'mail.message.received',
  idempotent: true,
  handler: async (ctx, payload) => {
    // Looks up or creates contact in core_contacts, logs activity to crm_activities
  },
};
```

### Pattern B: Core Shared Entities
Universal concepts shared across business domains reside in `@repo/core`:
- `core_contacts`: Customers, leads, suppliers.
- `core_files`: Documents, recordings, attachments.
- `core_users`: Staff, agents, managers.

### Pattern C: Runtime Optional Integrations
```typescript
// Inside packages/modules/mail/src/components/ThreadContextPanel.tsx
export function ThreadContextPanel({ contactId, ctx }: Props) {
  const hasCrm = ctx.integrations.isAvailable('crm');
  return (
    <div>
      <ContactDetails contactId={contactId} />
      {hasCrm && <CrmDealsWidget contactId={contactId} />}
    </div>
  );
}
```

---

## 5. Module Scaffolding and Contract Testing

### 5.1 Scaffolding CLI
Run the generator CLI from the workspace root:
```bash
pnpm module:create <module-id> --name "Human Name" --group <group>
```

Scaffolds the standard structure:
```
packages/modules/<module-id>/
├── src/
│   ├── index.ts              # Exports manifest
│   ├── routes/               # Page components
│   ├── api/                  # API route handlers
│   ├── components/           # UI components
│   ├── events/               # Event handlers
│   ├── jobs/                 # Background workers
│   ├── tools/                # Agent tools
│   └── schema.ts             # Drizzle table schemas
├── migrations/               # SQL migrations
├── test/
│   └── contract.test.ts      # Automated manifest contract test
├── package.json
└── tsconfig.json
```

### 5.2 Contract Test Suite
Every module package must pass the automated contract test suite in CI:
```typescript
import { validateModuleManifest } from '@repo/core/testing';
import { manifest } from '../src';

describe('Module Manifest Contract: ' + manifest.id, () => {
  it('satisfies the ModuleManifest specification', () => {
    const result = validateModuleManifest(manifest);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('prefixes all database tables with the module id', () => {
    manifest.migrations.forEach(migration => {
      // Validates CREATE TABLE <module-id>_* naming
    });
  });

  it('declares permissions with correct namespacing', () => {
    manifest.permissions.forEach(perm => {
      expect(perm.id.startsWith(`${manifest.id}.`)).toBe(true);
    });
  });
});
```

---

## 6. Minimal Reference Module Manifest

```typescript
import { z } from 'zod';
import { ModuleManifest } from '@repo/core';

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
      description: 'Read internal notes',
      category: 'General',
      defaultRoles: ['Owner', 'Admin', 'Manager', 'Agent', 'Viewer'],
    },
    {
      id: 'notes.write',
      name: 'Manage Notes',
      description: 'Create and edit internal notes',
      category: 'General',
      defaultRoles: ['Owner', 'Admin', 'Manager', 'Agent'],
    },
  ],
  navigation: [
    {
      id: 'notes-list',
      label: 'Notes',
      href: '/notes',
      icon: 'FileText',
      requiredPermissions: ['notes.view'],
    },
  ],
  routes: [
    {
      path: '/notes',
      componentPath: './routes/NotesListPage',
      title: 'Notes',
      requiredPermissions: ['notes.view'],
    },
  ],
  api: [
    {
      method: 'GET',
      path: '/api/notes',
      handler: './api/getNotes',
      requiredPermissions: ['notes.view'],
    },
    {
      method: 'POST',
      path: '/api/notes',
      handler: './api/createNote',
      requiredPermissions: ['notes.write'],
      inputSchema: z.object({ title: z.string().min(1), content: z.string() }),
    },
  ],
  settingsSchema: z.object({
    allowPublicSharing: z.boolean().default(false),
  }),
  migrations: [
    {
      version: 1,
      name: 'create_notes_table',
      up: `CREATE TABLE notes_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );`,
    },
  ],
  events: {
    emits: [
      {
        type: 'notes.created',
        description: 'Emitted when a note is created',
        payloadSchema: z.object({ id: z.string(), title: z.string() }),
      },
    ],
    handles: [],
  },
  agentTools: [
    {
      name: 'notes_search',
      description: 'Search internal notes by keyword',
      parameters: z.object({ query: z.string() }),
      requiredPermissions: ['notes.view'],
      riskLevel: 'read',
      defaultAutonomy: 'auto',
      execute: async (ctx, args) => {
        // Query scoped notes
      },
    },
  ],
};
```
