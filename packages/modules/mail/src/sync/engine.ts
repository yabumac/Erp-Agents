import { ModuleContext } from '@repo/core';
import { InboxProvider } from '../connectors/types';
import { MailAccount, MailThread, MailMessage } from '../types';
import { MailTriageAgent } from '../agents/triage';

export class MailSyncEngine {
  public static async syncAccount(
    ctx: ModuleContext,
    account: MailAccount,
    provider: InboxProvider
  ): Promise<{ syncedCount: number }> {
    const syncRes = await provider.syncIncremental(account.syncState || {});
    let count = 0;

    for (const raw of syncRes.newMessages) {
      // 1. Thread Upsert
      let thread = await ctx.db.findFirst('mail_threads', {
        provider_thread_id: raw.threadId,
      });

      if (!thread) {
        thread = await ctx.db.insert('mail_threads', {
          account_id: account.id,
          provider_thread_id: raw.threadId,
          subject: raw.subject,
          snippet: raw.snippet || raw.bodyText.substring(0, 120),
          category: 'other',
          priority: 'medium',
          status: 'open',
          message_count: 1,
          last_message_at: raw.date,
        });
      } else {
        thread = await ctx.db.update('mail_threads', thread.id, {
          snippet: raw.snippet || raw.bodyText.substring(0, 120),
          message_count: (thread.message_count || 1) + 1,
          last_message_at: raw.date,
        });
      }

      // 2. Insert Message
      const message = await ctx.db.insert('mail_messages', {
        thread_id: thread.id,
        account_id: account.id,
        provider_message_id: raw.id,
        from_address: raw.from,
        to_addresses: raw.to,
        subject: raw.subject,
        body_html: raw.bodyHtml,
        body_text: raw.bodyText,
        direction: 'inbound',
        status: 'received',
      });

      // 3. Emit core event: mail.message.received
      await ctx.events.emit('mail.message.received', {
        accountId: account.id,
        threadId: thread.id,
        messageId: message.id,
        from: raw.from,
        subject: raw.subject,
        snippet: thread.snippet,
        bodyText: raw.bodyText,
      });

      // 4. Run AI Triage
      await MailTriageAgent.triageThread(ctx, thread.id, raw);

      count++;
    }

    // Update account sync state
    await ctx.db.update('mail_accounts', account.id, {
      sync_state: syncRes.nextSyncState,
      status: 'active',
      last_sync_at: new Date().toISOString(),
    });

    return { syncedCount: count };
  }
}
