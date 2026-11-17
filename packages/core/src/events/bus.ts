import { TenantContext } from '../tenancy/context';
import { CoreEventRecord } from '../types/core';
import { ModuleContext } from '../types/manifest';

export type EventHandlerFn = (ctx: ModuleContext, payload: any) => Promise<void>;

export interface RegisteredHandler {
  event: string;
  handler: EventHandlerFn;
  idempotent: boolean;
  moduleId?: string;
}

export class EventBus {
  private static handlers: Map<string, RegisteredHandler[]> = new Map();
  private static processedIdempotencyKeys: Set<string> = new Set();

  public static registerHandler(
    event: string,
    handler: EventHandlerFn,
    options?: { idempotent?: boolean; moduleId?: string }
  ): void {
    if (!EventBus.handlers.has(event)) {
      EventBus.handlers.set(event, []);
    }
    EventBus.handlers.get(event)!.push({
      event,
      handler,
      idempotent: options?.idempotent ?? true,
      moduleId: options?.moduleId,
    });
  }

  public static clearHandlers(): void {
    EventBus.handlers.clear();
    EventBus.processedIdempotencyKeys.clear();
  }

  public static async emit(
    ctx: ModuleContext | TenantContext,
    type: string,
    payload: any,
    options?: { idempotencyKey?: string }
  ): Promise<CoreEventRecord> {
    const idempotencyKey =
      options?.idempotencyKey ||
      `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Outbox entry
    const record: CoreEventRecord = {
      id: `evt_rec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      tenantId: ctx.tenantId,
      type,
      payload,
      metadata: {
        actorId: (ctx as any).userId,
        actorType: (ctx as any).userId ? 'user' : 'system',
        traceId: (ctx as any).traceId || `trc_${Date.now()}`,
      },
      idempotencyKey,
      status: 'pending',
      attempts: 0,
      createdAt: new Date().toISOString(),
    };

    // Store in core_events outbox table
    await ctx.db.insert('core_events', record);

    // Immediate asynchronous dispatch to subscribed handlers
    await EventBus.dispatch(ctx as ModuleContext, record);

    return record;
  }

  public static async dispatch(ctx: ModuleContext, event: CoreEventRecord): Promise<void> {
    const handlers = EventBus.handlers.get(event.type) || [];
    const wildcardHandlers = EventBus.handlers.get('*') || [];
    const allHandlers = [...handlers, ...wildcardHandlers];

    if (allHandlers.length === 0) {
      await ctx.db.update('core_events', event.id, {
        status: 'completed',
        processedAt: new Date().toISOString(),
      });
      return;
    }

    const tenantScopedKey = `${event.tenantId}:${event.idempotencyKey}`;

    for (const h of allHandlers) {
      // Idempotency check
      if (h.idempotent && EventBus.processedIdempotencyKeys.has(tenantScopedKey)) {
        continue;
      }

      try {
        await h.handler(ctx, event.payload);
        if (h.idempotent) {
          EventBus.processedIdempotencyKeys.add(tenantScopedKey);
        }
      } catch (err: any) {
        await ctx.db.update('core_events', event.id, {
          status: 'failed',
          lastError: err?.message || String(err),
          attempts: event.attempts + 1,
        });
        throw err;
      }
    }

    await ctx.db.update('core_events', event.id, {
      status: 'completed',
      processedAt: new Date().toISOString(),
    });
  }
}
