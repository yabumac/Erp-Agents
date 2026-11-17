const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert');

const { ModuleRegistry } = require('../src/manifest/registry');
const { MemoryTenantDb } = require('../src/tenancy/db');
const { EventBus } = require('../src/events/bus');

describe('Tier 2: Module Host Lifecycle, Entitlements & Dynamic Navigation', () => {
  const tenantId = '018f45a2-tenant-host-test';
  let db;
  let ctx;

  const notesManifest = {
    id: 'notes',
    name: 'Internal Notes',
    version: '1.0.0',
    description: 'Notes module',
    icon: 'FileText',
    group: 'operate',
    permissions: [
      { id: 'notes.view', name: 'View Notes', description: 'View', category: 'General', defaultRoles: ['Owner'] },
      { id: 'notes.write', name: 'Manage Notes', description: 'Manage', category: 'General', defaultRoles: ['Owner'] },
    ],
    navigation: [
      { id: 'notes-nav', label: 'Notes', href: '', icon: 'FileText', requiredPermissions: ['notes.view'] },
    ],
    routes: [
      { path: '', title: 'Notes', requiredPermissions: ['notes.view'] },
      { path: '/new', title: 'New Note', requiredPermissions: ['notes.write'] },
    ],
    api: [],
    migrations: [],
    events: { emits: [], handles: [] },
  };

  const restrictedManifest = {
    id: 'unentitled_erp',
    name: 'Unentitled ERP',
    version: '1.0.0',
    description: 'Costly enterprise module',
    icon: 'Briefcase',
    group: 'operate',
    permissions: [{ id: 'unentitled_erp.view', name: 'View', description: 'View', category: 'General', defaultRoles: [] }],
    navigation: [{ id: 'erp-nav', label: 'ERP', href: '', icon: 'Briefcase', requiredPermissions: ['unentitled_erp.view'] }],
    routes: [],
    api: [],
    migrations: [],
    events: { emits: [], handles: [] },
  };

  beforeEach(() => {
    MemoryTenantDb.clearAll();
    ModuleRegistry.clear();
    EventBus.clearHandlers();

    db = new MemoryTenantDb(tenantId);
    ctx = {
      tenantId,
      db,
      events: { emit: () => Promise.resolve() },
      jobs: { enqueue: () => Promise.resolve('task_1') },
      storage: { upload: () => Promise.resolve('url'), getDownloadUrl: () => Promise.resolve('url') },
      settings: {},
      integrations: { isAvailable: () => false },
      logger: { info: () => {}, warn: () => {}, error: () => {} },
    };

    ModuleRegistry.register(notesManifest);
    ModuleRegistry.register(restrictedManifest);
  });

  test('Module enable adds module to active navigation and routes', async () => {
    // Enable notes module
    await ModuleRegistry.enableModule(ctx, 'notes');

    // User with notes.view permission
    const nav = await ModuleRegistry.getNavigation(db, tenantId, new Set(['notes.view']));
    assert.strictEqual(nav.length, 1);
    assert.strictEqual(nav[0].group, 'operate');
    assert.strictEqual(nav[0].items[0].label, 'Notes');
    assert.strictEqual(nav[0].items[0].href, '/notes');

    const routes = await ModuleRegistry.getRoutes(db, tenantId, new Set(['notes.view']));
    assert.strictEqual(routes.length, 1);
    assert.strictEqual(routes[0].path, '/notes');

    // User with both notes.view and notes.write gets all matching routes
    const allRoutes = await ModuleRegistry.getRoutes(db, tenantId, new Set(['notes.view', 'notes.write']));
    assert.strictEqual(allRoutes.length, 2);
  });

  test('Module disable removes module from navigation and routes at runtime without restart', async () => {
    await ModuleRegistry.enableModule(ctx, 'notes');
    let nav = await ModuleRegistry.getNavigation(db, tenantId, new Set(['notes.view']));
    assert.strictEqual(nav.length, 1);

    // Disable notes module at runtime
    await ModuleRegistry.disableModule(ctx, 'notes');

    nav = await ModuleRegistry.getNavigation(db, tenantId, new Set(['notes.view']));
    assert.strictEqual(nav.length, 0, 'Disabled module must not appear in navigation');

    const routes = await ModuleRegistry.getRoutes(db, tenantId, new Set(['notes.view']));
    assert.strictEqual(routes.length, 0, 'Disabled module routes must return empty');
  });

  test('Entitlements block enabling modules not included in plan', async () => {
    // Tenant plan does not include unentitled_erp
    await assert.rejects(
      async () => {
        await ModuleRegistry.enableModule(ctx, 'unentitled_erp');
      },
      /Entitlement Exception/,
      'Enabling module outside plan entitlements must throw Entitlement Exception'
    );
  });
});
