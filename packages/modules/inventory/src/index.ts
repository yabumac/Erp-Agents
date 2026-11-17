import { ModuleManifest, ModuleContext, ApiRequest, ApiResponse } from '@repo/core';

export const inventoryManifest: ModuleManifest = {
  id: 'inventory',
  name: 'Inventory & ERP Ledger',
  version: '1.0.0',
  description: 'Multi-warehouse append-only stock movement ledger, variants, serials, and physical stock counts',
  icon: 'Layers',
  group: 'operate',
  permissions: [
    {
      id: 'inv.view',
      name: 'View Inventory',
      description: 'View catalog, stock levels, and movement history',
      category: 'Inventory',
      defaultRoles: ['Owner', 'Admin', 'Manager', 'Agent', 'Viewer'],
    },
    {
      id: 'inv.adjust',
      name: 'Adjust Stock',
      description: 'Post stock movements and count adjustments',
      category: 'Inventory',
      defaultRoles: ['Owner', 'Admin', 'Manager'],
    },
  ],
  navigation: [
    {
      id: 'inv-items',
      label: 'Items & Stock',
      href: '/items',
      icon: 'Package',
      requiredPermissions: ['inv.view'],
    },
    {
      id: 'inv-ledger',
      label: 'Stock Ledger',
      href: '/ledger',
      icon: 'FileText',
      requiredPermissions: ['inv.view'],
    },
  ],
  routes: [
    { path: '/items', title: 'Items Catalog', requiredPermissions: ['inv.view'] },
    { path: '/ledger', title: 'Stock Movement Ledger', requiredPermissions: ['inv.view'] },
  ],
  api: [
    {
      method: 'GET',
      path: '/api/stock',
      requiredPermissions: ['inv.view'],
      handler: async (ctx: ModuleContext): Promise<ApiResponse> => {
        const movements = await ctx.db.findMany('inv_stock_movements');
        return { status: 200, data: movements };
      },
    },
  ],
  migrations: [
    {
      version: 1,
      name: 'create_inventory_ledger_tables',
      up: `
        CREATE TABLE inv_items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
          sku TEXT NOT NULL,
          name TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        CREATE TABLE inv_stock_movements (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
          item_id UUID NOT NULL REFERENCES inv_items(id) ON DELETE RESTRICT,
          type TEXT NOT NULL,
          quantity INT NOT NULL,
          unit_cost_cents BIGINT NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
      `,
    },
  ],
  events: {
    emits: [
      { type: 'inventory.stock.received', description: 'Stock received into warehouse' },
      { type: 'inventory.stock.shipped', description: 'Stock shipped to customer' },
      { type: 'inventory.stock.low', description: 'Stock dropped below reorder point' },
    ],
    handles: [],
  },
  agentTools: [
    {
      name: 'inv_checkStock',
      description: 'Check available quantity for an item SKU',
      parameters: { sku: 'string' },
      requiredPermissions: ['inv.view'],
      riskLevel: 'read',
      defaultAutonomy: 'auto',
      execute: async (ctx: ModuleContext, args: { sku: string }) => {
        const item = await ctx.db.findFirst('inv_items', { sku: args.sku });
        if (!item) return { found: false, quantity: 0 };
        const movements = await ctx.db.findMany('inv_stock_movements', { item_id: item.id });
        const onHand = movements.reduce((sum: number, m: any) => sum + (m.quantity || 0), 0);
        return { found: true, itemId: item.id, sku: item.sku, onHand };
      },
    },
  ],
};

export default inventoryManifest;
