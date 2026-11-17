import { ModuleContext } from '@repo/core';

export class MailTriageAgent {
  public static async triageThread(
    ctx: ModuleContext,
    threadId: string,
    rawMessage: { from: string; subject: string; bodyText: string }
  ): Promise<{ category: string; priority: string; contactId?: string }> {
    const text = `${rawMessage.subject} ${rawMessage.bodyText}`.toLowerCase();

    // 1. Classification
    let category = 'other';
    let priority = 'medium';

    if (text.includes('urgent') || text.includes('asap') || text.includes('down') || text.includes('broken')) {
      priority = 'urgent';
    } else if (text.includes('contract') || text.includes('deadline')) {
      priority = 'high';
    }

    if (text.includes('invoice') || text.includes('payment') || text.includes('billing') || text.includes('receipt') || text.includes('refund')) {
      category = 'billing';
    } else if (text.includes('demo') || text.includes('quote') || text.includes('pricing') || text.includes('purchase') || text.includes('order')) {
      category = 'sales';
    } else if (text.includes('help') || text.includes('issue') || text.includes('support') || text.includes('bug') || text.includes('error')) {
      category = 'support';
    } else if (text.includes('unsubscribe') || text.includes('newsletter') || text.includes('discount')) {
      category = 'promo';
    }

    // 2. Link or create CRM contact in core_contacts
    let contact = await ctx.db.findFirst('core_contacts', { email: rawMessage.from });
    if (!contact) {
      contact = await ctx.db.insert('core_contacts', {
        email: rawMessage.from,
        first_name: rawMessage.from.split('@')[0],
        source: 'inbound_email',
        tags: ['email-contact'],
        do_not_contact: false,
      });
    }

    // 3. Update thread with classified attributes
    await ctx.db.update('mail_threads', threadId, {
      category,
      priority,
      contact_id: contact.id,
    });

    return { category, priority, contactId: contact.id };
  }
}
