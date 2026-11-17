const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert');

// In-Memory Database and Tenant Isolation Context
const { MemoryTenantDb } = require('../src/tenancy/db');

describe('Tier 2: Multi-Tenant Data Isolation and RLS Engine', () => {
  const tenantA = '018f45a2-3b21-7000-8000-tenant-a-uuid';
  const tenantB = '018f45a2-3b21-7000-8000-tenant-b-uuid';

  let dbA;
  let dbB;

  beforeEach(() => {
    MemoryTenantDb.clearAll();
    dbA = new MemoryTenantDb(tenantA);
    dbB = new MemoryTenantDb(tenantB);
  });

  test('Tenant B cannot read records inserted by Tenant A', async () => {
    // Tenant A creates customer contacts and deals
    await dbA.insert('core_contacts', {
      id: 'contact_a_1',
      first_name: 'Alice',
      last_name: 'Smith',
      email: 'alice@tenanta.com',
    });

    await dbA.insert('crm_deals', {
      id: 'deal_a_1',
      name: 'Enterprise Contract',
      value_cents: 5000000,
    });

    // Tenant B queries the exact same tables
    const contactsB = await dbB.findMany('core_contacts');
    const dealsB = await dbB.findMany('crm_deals');

    assert.strictEqual(contactsB.length, 0, 'Tenant B must see 0 contacts from Tenant A');
    assert.strictEqual(dealsB.length, 0, 'Tenant B must see 0 deals from Tenant A');
  });

  test('Tenant B cannot lookup Tenant A record directly by ID', async () => {
    const docA = await dbA.insert('fin_documents', {
      id: 'invoice_a_999',
      number: 'INV-2026-001',
      total_cents: 120000,
    });

    const directLookup = await dbB.findById('fin_documents', 'invoice_a_999');
    assert.strictEqual(directLookup, null, 'Direct lookup by ID across tenant boundaries must return null');
  });

  test('Tenant B cannot update or overwrite Tenant A records', async () => {
    await dbA.insert('inv_items', {
      id: 'item_a_secret',
      sku: 'SKU-TENANT-A',
      name: 'Proprietary Widget',
    });

    await assert.rejects(
      async () => {
        await dbB.update('inv_items', 'item_a_secret', { name: 'Hacked Name' });
      },
      /Security Violation/,
      'Cross-tenant update must throw a Security Violation exception'
    );

    // Verify Tenant A data remains uncorrupted
    const original = await dbA.findById('inv_items', 'item_a_secret');
    assert.strictEqual(original.name, 'Proprietary Widget');
  });

  test('Tenant B cannot delete Tenant A records', async () => {
    await dbA.insert('mail_threads', {
      id: 'thread_a_confidential',
      subject: 'Confidential Acquisition',
    });

    await assert.rejects(
      async () => {
        await dbB.delete('mail_threads', 'thread_a_confidential');
      },
      /Security Violation/,
      'Cross-tenant delete must throw a Security Violation exception'
    );

    const check = await dbA.findById('mail_threads', 'thread_a_confidential');
    assert.notStrictEqual(check, null);
    assert.strictEqual(check.subject, 'Confidential Acquisition');
  });
});
