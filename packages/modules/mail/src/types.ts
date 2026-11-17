export interface MailAccount {
  id: string;
  tenantId: string;
  provider: 'gmail' | 'graph' | 'imap';
  emailAddress: string;
  displayName?: string;
  status: 'active' | 'error' | 'syncing';
  syncState: {
    historyId?: string;
    deltaToken?: string;
    lastSyncedAt?: string;
  };
}

export interface MailThread {
  id: string;
  tenantId: string;
  accountId: string;
  providerThreadId: string;
  contactId?: string;
  subject: string;
  snippet?: string;
  category: 'support' | 'sales' | 'billing' | 'partnership' | 'meeting' | 'spam' | 'promo' | 'other';
  priority: 'urgent' | 'high' | 'medium' | 'low';
  status: 'open' | 'snoozed' | 'done' | 'archived';
  messageCount: number;
  lastMessageAt: string;
}

export interface MailMessage {
  id: string;
  tenantId: string;
  threadId: string;
  accountId: string;
  fromAddress: string;
  toAddresses: string[];
  ccAddresses?: string[];
  subject: string;
  bodyHtml: string;
  bodyText: string;
  direction: 'inbound' | 'outbound';
  status: 'received' | 'draft' | 'queued' | 'sent' | 'failed' | 'bounced';
  sentAt?: string;
  createdAt: string;
}

export interface MailCampaign {
  id: string;
  tenantId: string;
  name: string;
  audienceId: string;
  fromAccountId: string;
  subjectA: string;
  subjectB?: string;
  bodyHtml: string;
  bodyText: string;
  status: 'draft' | 'scheduled' | 'sending' | 'paused' | 'completed' | 'failed';
  throttlePerMinute: number;
  totalRecipients: number;
  sentCount: number;
  openedCount: number;
  clickedCount: number;
  bouncedCount: number;
  resumeCursor: number; // Checkpoint for crash recovery
}

export interface MailSuppression {
  id: string;
  tenantId: string;
  email: string;
  reason: 'bounce' | 'complaint' | 'unsubscribe' | 'manual';
  createdAt: string;
}
