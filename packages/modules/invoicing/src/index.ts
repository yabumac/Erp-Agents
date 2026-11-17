import { ModuleManifest, ModuleContext, ApiRequest, ApiResponse } from '@repo/core';

export const invoicingManifest: ModuleManifest = {
  id: 'invoicing',
  name: 'Invoicing & Double-Entry Accounting',
  version: '1.0.0',
  description: 'Invoices, payments, credit notes, taxes, and double-entry general ledger posting',
  icon: 'CreditCard',
  group: 'finance',
  permissions: [
    {
      id: 'fin.view',
      name: 'View Financials',
      description: 'View invoices, payments, and general ledger',
      category: 'Finance',
      defaultRoles: ['Owner', 'Admin', 'Manager', 'Agent', 'Viewer'],
    },
    {
      id: 'fin.invoice.create',
      name: 'Create Invoices',
      description: 'Draft and issue customer invoices',
      category: 'Finance',
      defaultRoles: ['Owner', 'Admin', 'Manager', 'Agent'],
    },
    {
      id: 'fin.payment.record',
      name: 'Record Payments',
      description: 'Record and reconcile customer payments',
      category: 'Finance',
      defaultRoles: ['Owner', 'Admin', 'Manager'],
    },
  ],
  navigation: [
    {
      id: 'fin-invoices',
      label: 'Invoices',
      href: '/invoices',
      icon: 'FileText',
      requiredPermissions: ['fin.view'],
    },
    {
      id: 'fin-payments',
      label: 'Payments',
      href: '/payments',
      icon: 'DollarSign',
      requiredPermissions: ['fin.view'],
    },
    {
      id: 'fin-journal',
      label: 'General Ledger',
      href: '/journal',
      icon: 'BookOpen',
      requiredPermissions: ['fin.view'],
    },
  ],
  routes: [
    { path: '/invoices', title: 'Invoices Register', requiredPermissions: ['fin.view'] },
    { path: '/invoices/new', title: 'Create Invoice', requiredPermissions: ['fin.invoice.create'] },
    { path: '/payments', title: 'Payment Transactions', requiredPermissions: ['fin.view'] },
    { path: '/journal', title: 'General Ledger Journal', requiredPermissions: ['fin.view'] },
  ],
  api: [
    {
      method: 'GET',
      path: '/api/invoices',
      requiredPermissions: ['fin.view'],
      handler: async (ctx: ModuleContext): Promise<ApiResponse> => {
        const invoices = await ctx.db.findMany('fin_documents', { type: 'invoice' });
        return { status: 200, data: invoices };
      },
    },
  ],
  migrations: [
    {
      version: 1,
      name: 'create_financial_tables',
      up: `
        CREATE TABLE fin_documents (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
          type TEXT NOT NULL,
          number TEXT NOT NULL,
          total_cents BIGINT NOT NULL DEFAULT 0,
          status TEXT NOT NULL DEFAULT 'draft',
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        CREATE TABLE fin_journal_entries (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
          description TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        CREATE TABLE fin_journal_lines (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          entry_id UUID NOT NULL REFERENCES fin_journal_entries(id) ON DELETE CASCADE,
          account TEXT NOT NULL,
          debit_cents BIGINT NOT NULL DEFAULT 0,
          credit_cents BIGINT NOT NULL DEFAULT 0
        );
      `,
    },
  ],
  events: {
    emits: [
      { type: 'invoicing.invoice.created', description: 'Emitted when an invoice is created' },
      { type: 'invoicing.payment.received', description: 'Emitted when a payment is reconciled' },
    ],
    handles: [],
  },
  agentTools: [
    {
      name: 'fin_getInvoiceStatus',
      description: 'Get payment status and balance due for an invoice number',
      parameters: { invoiceNumber: 'string' },
      requiredPermissions: ['fin.view'],
      riskLevel: 'read',
      defaultAutonomy: 'auto',
      execute: async (ctx: ModuleContext, args: { invoiceNumber: string }) => {
        const inv = await ctx.db.findFirst('fin_documents', { number: args.invoiceNumber });
        if (!inv) return { found: false };
        return { found: true, number: inv.number, status: inv.status, totalCents: inv.total_cents };
      },
    },
  ],
};

export default invoicingManifest;
