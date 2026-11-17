# ADR-007: Inbound Inbox Synchronization and Outbound Bulk Email Providers

**Status:** Accepted  
**Date:** 2026-11-02  
**Deciders:** Core Engineering Team

## Context
The platform requires two distinct email capabilities:
1. **Interactive Inbox Connectivity:** Connecting customer mailboxes (Gmail, Microsoft 365, generic IMAP/SMTP) for two-way communication, triage, shared inboxes, and agent drafting.
2. **High-Volume Bulk Campaigns:** Sending marketing or transactional batch campaigns to thousands of recipients with high deliverability, throttling, domain verification (SPF/DKIM/DMARC), bounce/complaint handling, and one-click unsubscribe headers.

Requirements:
- Eliminate browser-polling dependencies from v1.
- Support push-based, incremental synchronization using history IDs or delta queries.
- Keep credentials encrypted at rest.
- Provide unified provider interfaces so individual transports can be swapped or tested via mocks.

## Alternatives Considered
- **Direct IMAP/SMTP for everything:** Works for legacy servers, but IMAP sync is brittle, lacks push notifications on modern cloud providers, and personal SMTP relays enforce strict daily quotas (e.g. 500 emails/day on Gmail).
- **SendGrid / Mailgun for bulk sending:** Reliable, but complex SDKs and higher pricing compared to modern developer-first alternatives.
- **Resend + Amazon SES + Gmail/Graph APIs:** Resend provides a clean, modern API with excellent deliverability, webhook infrastructure, and React Email support. Amazon SES provides ultra-low-cost bulk delivery. Official Gmail and Graph APIs provide rock-solid OAuth and push delta sync.

## Decision
We decouple email into two distinct provider interfaces in `packages/providers`:

### 1. Inbound & Conversational Mail (`InboxProvider`)
- **Implementations:**
  - `packages/providers/gmail`: Uses Google Cloud Gmail API v1 with `gmail.modify` scope. Listens to real-time mailbox push notifications via Google Cloud Pub/Sub webhooks, and performs incremental sync using `historyId`.
  - `packages/providers/microsoft-graph`: Uses Microsoft Graph API v1.0 with `Mail.ReadWrite` and `Mail.Send` scopes. Uses delta queries (`/me/mailFolders/inbox/messages/delta`) and lifecycle subscription webhooks.
  - `packages/providers/imap`: Generic RFC 3501 IMAP with IDLE push support for self-hosted or standard mail servers.
- **Sync Engine:** Jobs run durably in background workers, storing threads and messages in `mail_threads` and `mail_messages`.
- **Token Security:** OAuth refresh tokens and IMAP passwords are encrypted using AES-256-GCM envelope encryption stored in `core_secrets`.

### 2. Outbound Bulk Campaigns (`BulkSendProvider`)
- **Primary Adapter (`packages/providers/resend`):**
  - Sends transactional and bulk email via Resend REST API.
  - Verifies sending domains via DNS records (SPF, DKIM, DMARC, MX).
  - Ingests webhooks for delivered, opened, clicked, bounced, and complained events.
- **Secondary Adapters:**
  - `packages/providers/ses`: Amazon Simple Email Service (SES) v2 SDK for large-scale enterprise deployments.
  - `packages/providers/smtp`: Generic SMTP relay for offline or self-hosted Docker deployments.
- **Deliverability & Safety:**
  - Outbound campaigns strictly enforce suppression lists (`mail_suppressions`) containing past bounces, spam complaints, and unsubscribes.
  - Every campaign injects RFC 8058 `List-Unsubscribe` and `List-Unsubscribe-Post` headers.
  - Sends are throttled based on sending domain warm-up schedules and provider rate limits.

## Consequences
### Positive
- Browser tab is no longer required for email synchronization or sending.
- Full compliance with modern Gmail/Yahoo deliverability rules (SPF, DKIM, DMARC, one-click unsubscribe).
- Decoupled interfaces allow unit and integration testing via Mock Service Worker (MSW) without live credentials.

### Negative / Trade-offs
- Gmail API and Microsoft Graph integrations require verified developer applications for production multi-tenant use.
- Google Cloud Pub/Sub requires an active Google Cloud project with webhook endpoints configured.

## References
- Google Gmail API Push Notifications: https://developers.google.com/gmail/api/guides/push
- Microsoft Graph Delta Query Documentation: https://learn.microsoft.com/en-us/graph/delta-query-overview
- Resend API & Webhooks: https://resend.com/docs
- RFC 8058: One-Click Email Unsubscribe: https://datatracker.ietf.org/doc/html/rfc8058
