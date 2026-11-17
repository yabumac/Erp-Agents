#!/usr/bin/env node

/**
 * Module Scaffolding Generator
 * Usage: node scripts/create-module.js <module-id> [--name "Display Name"] [--group "operate"]
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const moduleId = args[0];

if (!moduleId) {
  console.error('Error: Please provide a module ID. Example: node scripts/create-module.js helpdesk');
  process.exit(1);
}

const nameArgIndex = args.indexOf('--name');
const moduleName = nameArgIndex !== -1 && args[nameArgIndex + 1] ? args[nameArgIndex + 1] : moduleId.charAt(0).toUpperCase() + moduleId.slice(1);

const groupArgIndex = args.indexOf('--group');
const moduleGroup = groupArgIndex !== -1 && args[groupArgIndex + 1] ? args[groupArgIndex + 1] : 'operate';

const targetDir = path.resolve(__dirname, '..', 'packages', 'modules', moduleId);

if (fs.existsSync(targetDir)) {
  console.error(`Error: Module directory already exists at ${targetDir}`);
  process.exit(1);
}

fs.mkdirSync(path.join(targetDir, 'src'), { recursive: true });
fs.mkdirSync(path.join(targetDir, 'migrations'), { recursive: true });
fs.mkdirSync(path.join(targetDir, 'test'), { recursive: true });

// 1. package.json
const packageJson = {
  name: `@repo/module-${moduleId}`,
  version: "1.0.0",
  private: true,
  main: "./src/index.ts",
  types: "./src/index.ts",
  dependencies: {
    "@repo/core": "workspace:*"
  },
  devDependencies: {
    "@repo/tsconfig": "workspace:*"
  }
};
fs.writeFileSync(path.join(targetDir, 'package.json'), JSON.stringify(packageJson, null, 2));

// 2. tsconfig.json
const tsconfig = {
  extends: "@repo/tsconfig/base.json",
  compilerOptions: {
    outDir: "./dist",
    rootDir: "./src"
  },
  include: ["src/**/*"]
};
fs.writeFileSync(path.join(targetDir, 'tsconfig.json'), JSON.stringify(tsconfig, null, 2));

// 3. src/index.ts
const manifestCode = `import { ModuleManifest, ModuleContext, ApiRequest, ApiResponse } from '@repo/core';

export const ${moduleId}Manifest: ModuleManifest = {
  id: '${moduleId}',
  name: '${moduleName}',
  version: '1.0.0',
  description: '${moduleName} module for the business operating system',
  icon: 'Box',
  group: '${moduleGroup}',
  permissions: [
    {
      id: '${moduleId}.view',
      name: 'View ${moduleName}',
      description: 'Read ${moduleName} records',
      category: 'General',
      defaultRoles: ['Owner', 'Admin', 'Manager', 'Agent', 'Viewer'],
    },
    {
      id: '${moduleId}.manage',
      name: 'Manage ${moduleName}',
      description: 'Create, update, and delete ${moduleName} records',
      category: 'General',
      defaultRoles: ['Owner', 'Admin', 'Manager'],
    },
  ],
  navigation: [
    {
      id: '${moduleId}-home',
      label: '${moduleName}',
      href: '',
      icon: 'Box',
      requiredPermissions: ['${moduleId}.view'],
    },
  ],
  routes: [
    {
      path: '',
      title: '${moduleName}',
      requiredPermissions: ['${moduleId}.view'],
    },
  ],
  api: [
    {
      method: 'GET',
      path: '/api/${moduleId}',
      requiredPermissions: ['${moduleId}.view'],
      handler: async (ctx: ModuleContext): Promise<ApiResponse> => {
        const records = await ctx.db.findMany('${moduleId}_items');
        return { status: 200, data: records };
      },
    },
  ],
  migrations: [
    {
      version: 1,
      name: 'create_${moduleId}_items_table',
      up: \`CREATE TABLE ${moduleId}_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );\`,
    },
  ],
  events: {
    emits: [
      {
        type: '${moduleId}.created',
        description: 'Emitted when a ${moduleId} record is created',
      },
    ],
    handles: [],
  },
  agentTools: [
    {
      name: '${moduleId}_query',
      description: 'Query ${moduleName} items',
      parameters: { query: 'string' },
      requiredPermissions: ['${moduleId}.view'],
      riskLevel: 'read',
      defaultAutonomy: 'auto',
      execute: async (ctx: ModuleContext, args: any) => {
        return await ctx.db.findMany('${moduleId}_items');
      },
    },
  ],
  onEnable: async (ctx: ModuleContext) => {
    ctx.logger.info('Module [${moduleId}] enabled');
  },
  onDisable: async (ctx: ModuleContext) => {
    ctx.logger.info('Module [${moduleId}] disabled');
  },
};

export default ${moduleId}Manifest;
`;
fs.writeFileSync(path.join(targetDir, 'src', 'index.ts'), manifestCode);

console.log(`Successfully scaffolded module [@repo/module-${moduleId}] at ${targetDir}`);
