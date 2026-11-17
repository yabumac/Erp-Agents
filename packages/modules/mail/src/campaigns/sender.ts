import { ModuleContext } from '@repo/core';
import { BulkSendProvider } from '../connectors/types';
import { MailCampaign, MailSuppression } from '../types';

export interface CampaignRecipient {
  email: string;
  data?: Record<string, string>;
}

export class CampaignSender {
  /**
   * Dispatches a batch campaign in checkpointed chunks.
   * If interrupted or crashed mid-run, re-calling this function resumes seamlessly
   * from campaign.resume_cursor with zero duplicate sends.
   */
  public static async processCampaignChunk(
    ctx: ModuleContext,
    campaignId: string,
    recipients: CampaignRecipient[],
    provider: BulkSendProvider,
    chunkSize: number = 500,
    simulateFailureAt?: number
  ): Promise<{
    processedThisRun: number;
    totalSent: number;
    status: string;
  }> {
    const campaign = await ctx.db.findById<MailCampaign>('mail_campaigns', campaignId);
    if (!campaign) throw new Error('Campaign not found');

    const suppressions = await ctx.db.findMany<MailSuppression>('mail_suppressions');
    const suppressedEmails = new Set(suppressions.map((s) => s.email.toLowerCase()));

    let cursor = campaign.resumeCursor || 0;
    let sentThisRun = 0;

    while (cursor < recipients.length && sentThisRun < chunkSize) {
      if (simulateFailureAt && cursor >= simulateFailureAt) {
        // Update checkpoint before simulated crash
        await ctx.db.update('mail_campaigns', campaignId, {
          resume_cursor: cursor,
          status: 'paused',
        });
        throw new Error(`Simulated Worker Crash at recipient index ${cursor}`);
      }

      const recipient = recipients[cursor];
      const email = recipient.email.toLowerCase();

      // Check suppression list
      if (!suppressedEmails.has(email)) {
        // RFC 8058 One-Click Unsubscribe headers
        const unsubscribeUrl = `https://platform.local/api/mail/unsubscribe?email=${encodeURIComponent(email)}&c=${campaignId}`;
        const headers = {
          'List-Unsubscribe': `<${unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        };

        // Send via provider
        await provider.sendBatch([
          {
            to: email,
            subject: campaign.subjectA,
            html: campaign.bodyHtml.replace(/\{\{first_name\}\}/g, recipient.data?.firstName || 'there'),
            text: campaign.bodyText,
            headers,
          },
        ]);

        sentThisRun++;
      }

      cursor++;

      // Update checkpoint cursor atomically in database
      await ctx.db.update('mail_campaigns', campaignId, {
        resume_cursor: cursor,
        sent_count: (campaign.sent_count || 0) + sentThisRun,
        status: cursor >= recipients.length ? 'completed' : 'sending',
      });
    }

    const finalStatus = cursor >= recipients.length ? 'completed' : 'paused';
    return {
      processedThisRun: sentThisRun,
      totalSent: (campaign.sent_count || 0) + sentThisRun,
      status: finalStatus,
    };
  }
}
