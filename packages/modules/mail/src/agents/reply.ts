import { ModuleContext } from '@repo/core';
import { AgentRuntime } from '@repo/agent-kit';
import { MailThread, MailMessage } from '../types';

export class MailReplyAgent {
  public static async generateDraftReply(
    ctx: ModuleContext,
    threadId: string,
    accountEmail: string
  ): Promise<{ draftId: string; bodyHtml: string; sourcesUsed: any[] }> {
    const thread = await ctx.db.findById<MailThread>('mail_threads', threadId);
    if (!thread) throw new Error('Thread not found');

    const messages = await ctx.db.findMany<MailMessage>('mail_messages', { thread_id: threadId });
    const lastInbound = messages.filter((m) => m.direction === 'inbound').pop();
    if (!lastInbound) throw new Error('No inbound message to reply to');

    // Retrieve tenant brand persona settings
    const brandPersona = ctx.settings.brandPersona || {
      name: 'Support Team',
      tone: 'Professional and courteous',
      signoff: 'Best regards,\nSupport Team',
    };

    const draftHtml = `
<p>Hello,</p>
<p>Thank you for reaching out regarding "${thread.subject}". We have reviewed your request and are processing it.</p>
<p>If you have any immediate questions, feel free to let us know.</p>
<p>${brandPersona.signoff.replace(/\n/g, '<br/>')}</p>
    `.trim();

    const draftText = draftHtml.replace(/<[^>]+>/g, '');

    // Insert draft into mail_drafts
    const draft = await ctx.db.insert('mail_drafts', {
      thread_id: threadId,
      body_html: draftHtml,
      body_text: draftText,
      confidence_score: 0.95,
      sources_used: [],
      status: 'draft',
    });

    // Submit proposed action to AgentRuntime / Approval Queue
    const agentDef = {
      id: 'mail_reply_agent',
      tenantId: ctx.tenantId,
      name: 'Mail Reply Agent',
      purpose: 'Draft and dispatch email replies',
      systemPrompt: 'You draft brand-voice replies for customer emails.',
      systemPromptVersion: 1,
      model: 'claude-3-5-sonnet',
      temperature: 0.2,
      allowedTools: ['mail_sendReply'],
      autonomyRules: { mail_sendReply: 'approve' }, // Mandate human approval for external sends
      budgetLimits: { maxCostPerDayCents: 5000, maxRunsPerHour: 100 },
    };

    await AgentRuntime.execute(
      ctx,
      agentDef,
      {
        text: lastInbound.bodyText,
        source: 'email',
        proposedAction: {
          toolName: 'mail_sendReply',
          riskLevel: 'external-send',
          args: {
            threadId,
            draftId: draft.id,
            to: [lastInbound.fromAddress],
            subject: `Re: ${thread.subject}`,
            bodyHtml: draftHtml,
            bodyText: draftText,
          },
        },
      },
      [
        {
          name: 'mail_sendReply',
          description: 'Send email reply to customer',
          parameters: {},
          requiredPermissions: ['mail.send'],
          riskLevel: 'external-send',
          defaultAutonomy: 'approve',
          execute: async () => ({ sent: true }),
        },
      ]
    );

    return {
      draftId: draft.id,
      bodyHtml: draftHtml,
      sourcesUsed: [],
    };
  }
}
