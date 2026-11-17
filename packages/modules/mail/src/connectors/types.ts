export interface RawMessage {
  id: string;
  threadId: string;
  from: string;
  to: string[];
  subject: string;
  bodyHtml: string;
  bodyText: string;
  date: string;
  snippet?: string;
  headers?: Record<string, string>;
}

export interface SyncResult {
  newMessages: RawMessage[];
  updatedThreads: string[];
  nextSyncState: Record<string, any>;
}

export interface InboxProvider {
  syncIncremental(syncState: Record<string, any>): Promise<SyncResult>;
  sendEmail(message: {
    to: string[];
    subject: string;
    bodyHtml: string;
    bodyText: string;
    inReplyTo?: string;
  }): Promise<{ messageId: string; threadId: string }>;
}

export interface BulkSendProvider {
  sendBatch(
    emails: Array<{
      to: string;
      subject: string;
      html: string;
      text: string;
      headers?: Record<string, string>;
    }>
  ): Promise<Array<{ messageId: string; status: 'sent' | 'failed'; error?: string }>>;
  verifyDomain(domain: string): Promise<{
    spf: boolean;
    dkim: boolean;
    dmarc: boolean;
    mx: boolean;
  }>;
}

/**
 * High-Fidelity Mock & Local Mailbox Connector
 * Zero-credential testing adapter supporting incremental delta sync
 */
export class MockInboxProvider implements InboxProvider {
  private mailbox: RawMessage[] = [];
  private sentLog: any[] = [];

  constructor(initialMessages: RawMessage[] = []) {
    this.mailbox = [...initialMessages];
  }

  addInboundMessage(msg: RawMessage): void {
    this.mailbox.push(msg);
  }

  async syncIncremental(syncState: Record<string, any>): Promise<SyncResult> {
    const lastIndex = syncState.cursor || 0;
    const newItems = this.mailbox.slice(lastIndex);
    const updatedThreads = Array.from(new Set(newItems.map((m) => m.threadId)));

    return {
      newMessages: newItems,
      updatedThreads,
      nextSyncState: {
        cursor: this.mailbox.length,
        historyId: `hist_${this.mailbox.length}`,
        lastSyncedAt: new Date().toISOString(),
      },
    };
  }

  async sendEmail(message: {
    to: string[];
    subject: string;
    bodyHtml: string;
    bodyText: string;
  }): Promise<{ messageId: string; threadId: string }> {
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const threadId = `th_${Date.now()}`;
    this.sentLog.push({ ...message, messageId, threadId, sentAt: new Date().toISOString() });
    return { messageId, threadId };
  }

  getSentLog(): any[] {
    return this.sentLog;
  }
}
