# ADR-009: Modular Communication Architecture and Event Bus

**Status:** Accepted  
**Date:** 2026-11-02  
**Deciders:** Core Engineering Team

## Context
The platform is designed around 15 independent, opt-in module packages (`packages/modules/*`).
A customer may purchase Core + Mail + Voice, or Core + Inventory + Invoicing, or all modules.
Critical requirements:
1. **Modules must never import each other directly.** Importing `from '@repo/module-crm'` inside `@repo/module-mail` is strictly forbidden and rejected by linting and CI boundaries.
2. If CRM is disabled or not installed, Mail must still function flawlessly, merely suppressing CRM-dependent UI elements (like "link to deal").
3. Modules must communicate asynchronously via typed events, and synchronously via shared core entities (contacts, files, users) or declared optional integrations.
4. Events must be delivered durably with at-least-once semantics and idempotent consumer handling.

## Alternatives Considered
- **Direct RPC / Service Injection between modules:** Creates tight coupling, dependency cycles, and complex initialization ordering. If module B is uninstalled, module A crashes on invocation.
- **Kafka / RabbitMQ / External Message Broker:** High infrastructure footprint, unnecessary complexity for serverless deployments, and requires running dedicated broker clusters.
- **Transactional Outbox Event Bus backed by PostgreSQL + Background Worker:** Events are written into `core_events` within the same database transaction as the business operation. The job system (Trigger.dev / BullMQ) dispatches events to registered handlers with automatic retries and dead-letter handling.

## Decision
We implement a **Transactional Outbox Event Bus** managed by `@repo/core`:
1. **Event Structure (`packages/core/src/events/types.ts`):**
   ```typescript
   export interface CoreEvent<T = Record<string, unknown>> {
     id: string;
     tenantId: string;
     type: string; // e.g. "mail.message.received", "inv.stock.low"
     payload: T;
     metadata: {
       actorId?: string;
       actorType: 'user' | 'agent' | 'system';
       traceId: string;
     };
     idempotencyKey: string;
     createdAt: string;
   }
   ```
2. **Publishing Pattern:**
   - Modules publish events via `ctx.events.emit(type, payload, options)`.
   - The event is inserted into the `core_events` table within the active database transaction.
   - If the business transaction fails, the event is rolled back automatically (zero phantom events).
3. **Dispatch & Consumption:**
   - Background workers poll or receive webhook triggers from Trigger.dev to dispatch pending events.
   - Module manifests declare event subscriptions:
     ```typescript
     events: {
       emits: [{ type: 'voice.call.completed', description: 'Fired when call terminates' }],
       handles: [{
         event: 'mail.message.received',
         handler: handleNewMailForTicketCreation,
         idempotent: true
       }]
     }
     ```
   - Handlers receive event payloads with an injected database session pre-scoped to `tenantId`.
4. **Shared Entities:**
   - Universal entities shared across modules reside exclusively in `@repo/core`:
     - `core_contacts`: Common customer directory used by Mail, CRM, Voice, Invoicing.
     - `core_files`: Storage references for attachments, documents, voice recordings.
     - `core_users`: Employee identities, permissions, assignments.
5. **Optional Integrations:**
   - Modules declare `optionalIntegrations: ['crm']`.
   - Core provides an integration resolver: `ctx.integrations.isAvailable('crm')`. If present, UI hooks render links to deals or CRM pipelines; if absent, the UI gracefully renders standard contact info.

## Consequences
### Positive
- Modules can be hot-enabled, disabled, or uninstalled per tenant at runtime without touching other code.
- Outbox pattern ensures 100% reliable event publishing without distributed transaction managers.
- Audit trail and event replay are built into the database architecture.

### Negative / Trade-offs
- Eventual consistency between modules: Changes in one module take a few hundred milliseconds to propagate to downstream modules.
- Handlers must be strictly idempotent to handle at-least-once delivery safely.

## References
- Transactional Outbox Pattern: https://microservices.io/patterns/data/transactional-outbox.html
- Idempotent Consumer Pattern: https://www.enterpriseintegrationpatterns.com/patterns/messaging/IdempotentReceiver.html
