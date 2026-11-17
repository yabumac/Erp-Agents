export type ModuleGroup =
  | 'communicate'
  | 'sell'
  | 'operate'
  | 'finance'
  | 'insights'
  | 'admin';

export type RiskLevel = 'read' | 'write' | 'external-send' | 'financial';
export type AutonomyLevel = 'suggest' | 'approve' | 'auto';

export interface PermissionDef {
  id: string; // e.g. "mail.campaign.send"
  name: string;
  description: string;
  category: string;
  defaultRoles: ('Owner' | 'Admin' | 'Manager' | 'Agent' | 'Viewer')[];
}

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: string;
  requiredPermissions: string[];
  badgeCountProvider?: string;
}

export interface RouteDef {
  path: string;
  title: string;
  componentPath?: string;
  component?: any;
  requiredPermissions: string[];
  layout?: 'default' | 'fullscreen' | 'canvas';
}

export interface ApiRouteDef {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  handler: (ctx: ModuleContext, req: ApiRequest) => Promise<ApiResponse>;
  requiredPermissions: string[];
  rateLimit?: {
    windowMs: number;
    maxRequests: number;
  };
}

export interface ApiRequest {
  params?: Record<string, string>;
  query?: Record<string, string | string[]>;
  body?: any;
  headers?: Record<string, string>;
}

export interface ApiResponse<T = any> {
  status: number;
  data?: T;
  error?: string;
}

export interface WidgetDef {
  id: string;
  name: string;
  description: string;
  size: 'small' | 'medium' | 'large' | 'full';
  componentPath?: string;
  component?: any;
  requiredPermissions: string[];
  refreshIntervalSeconds?: number;
}

export interface MigrationDef {
  version: number;
  name: string;
  up: string;
  down?: string;
}

export interface EventDef {
  type: string;
  description: string;
  payloadSchema?: any;
}

export interface EventHandlerDef {
  event: string;
  handler: (ctx: ModuleContext, payload: any) => Promise<void>;
  idempotent: boolean;
  retryLimit?: number;
}

export interface JobDef {
  id: string;
  cron?: string;
  handler: (ctx: ModuleContext, payload?: any) => Promise<void>;
  concurrency?: number;
}

export interface AgentToolDef {
  name: string;
  description: string;
  parameters: any;
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
  userRole?: string;
  db: any;
  events: {
    emit: (type: string, payload: any, options?: { idempotencyKey?: string }) => Promise<void>;
  };
  jobs: {
    enqueue: (jobId: string, payload: any, options?: any) => Promise<string>;
  };
  storage: {
    upload: (key: string, data: Buffer | Uint8Array, mimeType: string) => Promise<string>;
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
  id: string;
  name: string;
  version: string;
  description: string;
  icon: string;
  group: ModuleGroup;
  requires?: string[];
  optionalIntegrations?: string[];
  permissions: PermissionDef[];
  navigation: NavItem[];
  routes: RouteDef[];
  api: ApiRouteDef[];
  dashboardWidgets?: WidgetDef[];
  settingsSchema?: any;
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
