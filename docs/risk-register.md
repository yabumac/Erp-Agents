# Engineering & Product Risk Register

Risk Identification, Severity Scoring, and Mitigation Strategies

---

## 1. Risk Evaluation Matrix

| Likelihood \ Impact | Low | Medium | High |
|---|---|---|---|
| **High** | Medium Risk | High Risk | **Critical Risk** |
| **Medium** | Low Risk | Medium Risk | High Risk |
| **Low** | Low Risk | Low Risk | Medium Risk |

---

## 2. Risk Register

| ID | Category | Risk Description | Impact | Likelihood | Score | Mitigation Strategy | Owner | Status |
|---|---|---|---|---|---|---|---|---|
| **R-001** | Technical / Scope | **Scope vs. Team Size:** Developing 8 complex modules, an agent runtime, voice pipeline, and dual-target deployment exceeds typical single-engineer capacity. | High | High | **Critical** | Execute phased delivery gates strictly. Build modules with minimal essential feature sets first; defer advanced capabilities (e.g. multi-currency hedging) to later iterations. | Lead Arch | Mitigated |
| **R-002** | Security | **Cross-Tenant Data Leakage:** A bug in application queries or an agent tool exposes sensitive records between competing tenant companies. | High | Low | High | Mandatory PostgreSQL Row Level Security (RLS) enforced at the database engine level, supplemented with Drizzle middleware asserting `tenant_id` on all queries. Automated CI tenant isolation suite blocks releases. | Security | Mitigated |
| **R-003** | Security | **Prompt Injection Attacks:** Malicious external email bodies or customer files inject commands into LLM prompts, triggering unauthorized tool execution (e.g. data exfiltration or unauthorized payments). | High | Medium | High | Quarantine all untrusted inputs inside `<untrusted_content>` XML wrappers. Enforce strict JSON schema validation, risk-tiered tool permissions, and require human approval for all external actions. CI eval suite tests 50 adversarial prompts. | Agent Lead | Mitigated |
| **R-004** | Technical | **Realtime Voice Latency & Barge-In Complexity:** Mouth-to-ear latency exceeds 1.5 seconds or barge-in fails, creating awkward conversational lag on phone calls. | High | Medium | High | Integrate LiveKit Agents with optimized streaming components: Deepgram Nova-2 (STT), Anthropic Claude 3.5 Sonnet / Haiku, and Cartesia/ElevenLabs (TTS). Avoid custom WebSockets. | Voice Eng | Mitigated |
| **R-005** | Financial | **LLM Token & Telephony Cost Overruns:** High-volume email triage loops or lengthy voice calls cause runaway API billing. | Medium | High | High | Enforce hard per-tenant daily budget caps (`max_cost_per_day_cents`) in `agent_definitions`. Provide Bring-Your-Own-Key (BYOK) option. Rate limit auto-replies to 1 per thread. | Billing Eng | Mitigated |
| **R-006** | Compliance | **Outbound Telephony Compliance Violations:** Outbound AI voice campaigns violate US TCPA or FTC TSR regulations (calling outside legal hours, calling DNC numbers, or omitting AI disclosures). | High | Low | High | Build automated launch-gate checks into `voice_outbound_campaigns`. Block campaign dispatch if region calling hours, DNC verification, or AI disclosure nodes are unconfigured. | Legal / Voice | Mitigated |
| **R-007** | External | **OAuth App Verification Delays:** Google and Microsoft require extensive security verification for `gmail.modify` and Graph mail permissions before public multi-tenant launch. | High | Medium | High | Support generic IMAP/SMTP as immediate fallback. Allow enterprise customers to provide their own Google Cloud / Azure OAuth client credentials (Internal App mode) while public verification progresses. | Integrations | Accepted |
| **R-008** | Technical | **Job Worker Failure Mid-Campaign:** A serverless timeout or process crash during a 10,000-recipient email campaign causes duplicate emails or stalled sends. | High | Low | High | Employ Trigger.dev v3 with step-level durability and checkpointed cursors. Every email send verifies against an idempotency key before dispatch. | Core Eng | Mitigated |
| **R-009** | Technical | **Email Deliverability & Spam Flagging:** Bulk emails sent from new tenant domains bounce or land in spam folders, ruining sender reputation. | High | Medium | High | Provide a Sending Domain Verification wizard validating SPF, DKIM, DMARC, and MX records. Enforce automatic warmup throttling and strict unsubscribe header injection (`List-Unsubscribe`). | Mail Eng | Mitigated |
| **R-010** | Domain | **Inventory Ledger Variance & Inaccuracy:** Non-atomic stock updates result in negative inventory balances or phantom stock counts. | High | Low | High | Treat stock movements as an append-only ledger (`inv_stock_movements`). Disallow direct row updates on quantity columns. Enforce database transactions for all movements. | ERP Lead | Mitigated |
| **R-011** | Domain | **Double-Entry Journal Imbalance:** Broken financial transactions cause debits to not match credits, corrupting accounting reports. | High | Low | High | Enforce a PostgreSQL constraint and application assertion that `SUM(debit_cents) = SUM(credit_cents)` for every journal entry before commit. Reject unbalanced postings. | Finance Lead | Mitigated |
| **R-012** | Technical | **Dual-Target Code Drift:** Discrepancies between Vercel serverless behavior and Docker Compose containers lead to self-hosted bugs. | Medium | Medium | Medium | Maintain decoupled provider interfaces (`JobProvider`, `StorageProvider`, `TelephonyProvider`). Validate both Docker Compose and serverless environments in CI. | DevOps | Mitigated |
| **R-013** | Product | **"Rebrand in a Day" Asset Bottlenecks:** A customer takes weeks to deploy due to complex asset preparation and PDF template styling. | Medium | Medium | Medium | Provide `pnpm brand:create <name>` scaffolding CLI with default fallback tokens, and `pnpm brand:validate` to automatically verify asset completeness and WCAG contrast. | Design Lead | Mitigated |
| **R-014** | Technical | **Vector Database Scalability:** As knowledge bases grow to millions of chunks, pgvector query latency degrades. | Medium | Low | Low | Utilize HNSW indexing (`m = 16`, `ef_construction = 64`) with cosine distance on partitioned chunks by `tenant_id`. Partitioning maintains fast index scans under scale. | Data Eng | Mitigated |
| **R-015** | Environment | **Local Developer Disk Footprint:** Workspace machine has ~10GB free disk space; bloated `node_modules` or Docker layers cause disk exhaustion. | Medium | High | High | Enforce pnpm content-addressable storage. Add multi-stage Docker builds with aggressive layer caching. Implement `.dockerignore` and cleanup scripts. | Dev Tools | Mitigated |
