# ADR-004: Durable Background Work and Job System

**Status:** Accepted  
**Date:** 2026-11-02  
**Deciders:** Core Engineering Team

## Context
The platform executes high-volume, mission-critical asynchronous tasks:
- Incremental mailbox sync (Gmail push webhooks and delta queries).
- Batch campaign sending (10k+ recipients, throttled to provider limits with resume support).
- Outbound voice call queues and post-call speech-to-text processing.
- Inventory reorder point scans and stock valuation calculations.
- Agent run executions and automation workflow steps.

Key requirements:
1. Durable execution with step-level checkpointing (surviving process restarts and serverless timeouts).
2. Native cron scheduling, automatic retries with exponential backoff, and dead-letter queues (DLQ).
3. Strict idempotency keys to prevent duplicate emails or duplicate stock adjustments.
4. Support for both serverless Vercel deployments and on-premises Docker containers.

## Alternatives Considered
- **BullMQ + Redis only:** Industry-standard for containerized Node.js, but cannot run directly inside serverless functions without long-lived TCP connection management and separate worker infrastructure.
- **Inngest:** Strong durable execution engine with serverless step functions, but on-premise self-hosting licensing and setup is heavier.
- **Trigger.dev v3:** Built specifically for TypeScript, runs natively on serverless with full checkpointing, provides an open-source self-hostable container engine, offers an intuitive web dashboard, and supports long-running workloads with zero timeout limitations.

## Decision
We select **Trigger.dev v3** as our primary orchestration engine, encapsulated behind a generic `@repo/core` **`JobProvider` adapter interface**:
1. **Adapter Interface (`packages/core/src/jobs/types.ts`):**
   ```typescript
   export interface JobProvider {
     enqueue<T>(jobId: string, payload: T, options?: JobOptions): Promise<string>;
     schedule<T>(jobId: string, cron: string, payload: T): Promise<string>;
     cancel(taskId: string): Promise<void>;
     getTaskStatus(taskId: string): Promise<TaskStatus>;
   }
   ```
2. **Primary Adapter (`packages/providers/trigger`):**
   - Implements `JobProvider` using Trigger.dev v3 tasks, Realtime triggers, and durability steps.
   - Used for production cloud deployment on Vercel.
3. **Fallback Adapter (`packages/providers/bullmq`):**
   - Implements `JobProvider` using BullMQ with a Redis connection for offline or containerized self-hosted deployments (`apps/worker`).
4. **Idempotency & Tenant Scoping:**
   - Every job invocation payload must include `tenantId` and an `idempotencyKey`.
   - The worker initializes the database session with `app.current_tenant_id = tenantId` before executing job logic.
5. **Dead-Letter Management:**
   - Failed executions are recorded in `core_events` with error traces and surfaced in the admin dashboard for one-click retry.

## Consequences
### Positive
- Serverless workloads are not limited by Vercel function timeout ceilings (e.g. 30s or 60s).
- Unified task code runs cleanly across both Trigger.dev cloud and Docker worker containers.
- Step-level durability enables resumable 10,000-recipient email campaigns without duplicate sends.

### Negative / Trade-offs
- Trigger.dev v3 introduces a dependency on the Trigger.dev cloud service or a self-hosted Trigger instance.
- Dual-adapter maintenance requires contract test coverage proving parity between Trigger and BullMQ adapters.

## References
- Trigger.dev v3 Documentation: https://trigger.dev/docs
- BullMQ Guide: https://docs.bullmq.io
- Temporal / Durable Execution Principles: https://temporal.io
