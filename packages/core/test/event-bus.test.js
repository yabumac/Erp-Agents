const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert');

const { EventBus } = require('../src/events/bus');
const { MemoryTenantDb } = require('../src/tenancy/db');

describe('Tier 2: Transactional Event Bus & Idempotency', () => {
  const tenantId = '018f45a2-tenant-event-bus-test';
  let db;
  let ctx;

  beforeEach(() => {
    MemoryTenantDb.clearAll();
    EventBus.clearHandlers();
    db = new MemoryTenantDb(tenantId);
    ctx = {
      tenantId,
      db,
      events: {
        emit: (type, payload, opts) => EventBus.emit(ctx, type, payload, opts),
      },
    };
  });

  test('Emits events to outbox and delivers to subscribed handlers', async () => {
    let handledCount = 0;
    let receivedPayload = null;

    EventBus.registerHandler('mail.message.received', async (context, payload) => {
      handledCount++;
      receivedPayload = payload;
    });

    const event = await EventBus.emit(ctx, 'mail.message.received', {
      subject: 'Inquiry',
      from: 'customer@acme.com',
    });

    assert.strictEqual(handledCount, 1);
    assert.strictEqual(receivedPayload.subject, 'Inquiry');
    assert.strictEqual(event.type, 'mail.message.received');

    // Verify outbox persistence
    const storedEvent = await db.findById('core_events', event.id);
    assert.strictEqual(storedEvent.status, 'completed');
  });

  test('Idempotent handlers execute exactly once even on duplicate deliveries', async () => {
    let runCount = 0;

    EventBus.registerHandler('inv.stock.adjusted', async () => {
      runCount++;
    }, { idempotent: true });

    // Emit event with fixed idempotency key
    const idempotencyKey = 'fixed-idempotency-key-12345';
    await EventBus.emit(ctx, 'inv.stock.adjusted', { delta: 5 }, { idempotencyKey });
    
    // Attempt duplicate emit with same idempotency key
    await EventBus.emit(ctx, 'inv.stock.adjusted', { delta: 5 }, { idempotencyKey });

    assert.strictEqual(runCount, 1, 'Idempotent handler should only execute once');
  });
});
