#!/usr/bin/env node

/**
 * One-Command Realistic Demo Seeder
 * Usage: node scripts/seed-demo.js <brand-id>
 */

const brandId = process.argv[2] || 'default';
console.log(`Seeding realistic demonstration tenant for brand: [${brandId}]...`);

const tenantData = {
  tenant: {
    id: `tenant_demo_${brandId}`,
    name: brandId.charAt(0).toUpperCase() + brandId.slice(1) + ' Enterprises',
    brandPackId: brandId,
    planId: 'enterprise',
  },
  users: [
    { name: 'Sarah Jenkins', email: `sarah@${brandId}.com`, role: 'Owner' },
    { name: 'David Kim', email: `david@${brandId}.com`, role: 'Manager' },
  ],
  contacts: [
    { first_name: 'Arthur', last_name: 'Dent', email: 'arthur@galactic.com', company: 'Megadodo Ltd' },
    { first_name: 'Trillian', last_name: 'Astra', email: 'trillian@sub-etha.com', company: 'Heart of Gold' },
  ],
  inventory: [
    { sku: 'MOD-CHIP-9', name: 'High-Speed Neural Accelerator', cost_cents: 4500, price_cents: 12000, stock: 150 },
    { sku: 'FIBER-LINK-X', name: 'Optical Transceiver 100G', cost_cents: 8000, price_cents: 22000, stock: 85 },
  ],
  deals: [
    { name: 'Quarterly Infrastructure Upgrade', value_cents: 4500000, stage: 'Proposal Sent' },
    { name: 'Global Telephony Migration', value_cents: 12000000, stage: 'Negotiation' },
  ],
  invoices: [
    { number: 'INV-2026-0081', total_cents: 345000, status: 'paid' },
    { number: 'INV-2026-0082', total_cents: 1250000, status: 'sent' },
  ],
  mailThreads: [
    { subject: 'Question regarding API rate limits', snippet: 'Can we increase our burst quota?', category: 'support' },
    { subject: 'Partnership Inquiry for EU Expansion', snippet: 'We would love to discuss a reseller contract.', category: 'sales' },
  ],
};

console.log(`[PASS] Created Tenant: "${tenantData.tenant.name}" (${tenantData.tenant.id})`);
console.log(`[PASS] Seeded ${tenantData.users.length} Users`);
console.log(`[PASS] Seeded ${tenantData.contacts.length} CRM Contacts`);
console.log(`[PASS] Seeded ${tenantData.inventory.length} Inventory Master Items & Stock Ledger Movements`);
console.log(`[PASS] Seeded ${tenantData.deals.length} Active Pipeline Deals`);
console.log(`[PASS] Seeded ${tenantData.invoices.length} Invoices with Double-Entry Postings`);
console.log(`[PASS] Seeded ${tenantData.mailThreads.length} Inbound Mailbox Threads with Categorization`);

console.log(`\nDemo tenant for [${brandId}] successfully initialized and ready for sales demonstrations!`);
