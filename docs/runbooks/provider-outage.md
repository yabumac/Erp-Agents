# Operational Runbook: Provider Outage and Fallback Procedures

Handling Third-Party Upstream Service Degradations

---

## 1. Provider Redundancy Matrix

| Service Domain | Primary Provider | Automated Fallback | Manual Failover Procedure |
|---|---|---|---|
| **Bulk Email Sending** | Resend API | Amazon SES v2 Adapter | Toggle `MAIL_BULK_PROVIDER=ses` in environment settings |
| **Inbound Mail Sync** | Gmail / Microsoft Graph Push | Incremental Polling Engine | Disable webhooks; trigger cron sync every 5 minutes |
| **Realtime Telephony** | Twilio SIP Trunk | Telnyx SIP Adapter | Switch telephony adapter credentials in `packages/providers` |
| **Voice Speech-to-Text** | Deepgram Nova-2 | Whisper Cloud / OpenAI STT | Update LiveKit Agent STT plugin configuration |
| **LLM Inference** | Anthropic Claude 3.5 Sonnet | Google Gemini / OpenAI GPT-4o | Vercel AI SDK dynamic fallback chain |
| **Object Storage** | Cloudflare R2 / AWS S3 | Local MinIO Container | Update `STORAGE_PROVIDER=minio` and endpoint URL |

---

## 2. LLM Provider Rate-Limit or Outage Fallback
The agent runtime in `@repo/agent-kit` implements an automatic retry and fallback chain:
1. Attempt 1: Default Primary (`claude-3-5-sonnet`).
2. If HTTP 429 (Rate Limit) or 503 (Overloaded):
   - Backoff exponentially (500ms, 1500ms).
   - If unrecovered after 2 attempts, failover automatically to secondary reasoning model (`gemini-1.5-pro` or `gpt-4o`).
3. If all external providers fail: Escalate task to tenant **Approval Queue** with status `provider_unavailable` rather than hallucinating or silently dropping tasks.
