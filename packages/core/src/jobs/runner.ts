import { ModuleContext } from '../types/manifest';

export interface JobOptions {
  delayMs?: number;
  idempotencyKey?: string;
  retries?: number;
}

export type JobHandlerFn = (ctx: ModuleContext, payload: any) => Promise<void>;

export interface JobProvider {
  enqueue<T = any>(jobId: string, payload: T, options?: JobOptions): Promise<string>;
  schedule<T = any>(jobId: string, cron: string, payload: T): Promise<string>;
  cancel(taskId: string): Promise<void>;
  register(jobId: string, handler: JobHandlerFn): void;
}

/**
 * Resilient In-Memory & Local Job Runner
 */
export class MemoryJobRunner implements JobProvider {
  private handlers: Map<string, JobHandlerFn> = new Map();
  private scheduledJobs: Map<string, { cron: string; payload: any }> = new Map();
  private enqueuedTasks: Map<string, { jobId: string; payload: any; status: string }> = new Map();
  private ctxFactory?: (tenantId: string) => ModuleContext;

  constructor(ctxFactory?: (tenantId: string) => ModuleContext) {
    this.ctxFactory = ctxFactory;
  }

  register(jobId: string, handler: JobHandlerFn): void {
    this.handlers.set(jobId, handler);
  }

  async enqueue<T = any>(jobId: string, payload: T, options?: JobOptions): Promise<string> {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    this.enqueuedTasks.set(taskId, { jobId, payload, status: 'pending' });

    const handler = this.handlers.get(jobId);
    if (handler && this.ctxFactory) {
      const tenantId = (payload as any)?.tenantId || 'system';
      const ctx = this.ctxFactory(tenantId);
      
      const execute = async () => {
        try {
          await handler(ctx, payload);
          this.enqueuedTasks.set(taskId, { jobId, payload, status: 'completed' });
        } catch (err) {
          this.enqueuedTasks.set(taskId, { jobId, payload, status: 'failed' });
        }
      };

      if (options?.delayMs) {
        setTimeout(execute, options.delayMs);
      } else {
        setImmediate(execute);
      }
    }

    return taskId;
  }

  async schedule<T = any>(jobId: string, cron: string, payload: T): Promise<string> {
    const scheduleId = `sched_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    this.scheduledJobs.set(scheduleId, { cron, payload });
    return scheduleId;
  }

  async cancel(taskId: string): Promise<void> {
    this.enqueuedTasks.delete(taskId);
    this.scheduledJobs.delete(taskId);
  }
}
