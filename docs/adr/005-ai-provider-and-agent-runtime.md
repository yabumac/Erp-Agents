# ADR-005: AI Layer, Agent Runtime, and Guardrails Architecture

**Status:** Accepted  
**Date:** 2026-11-02  
**Deciders:** Core Engineering Team

## Context
The platform positions AI as a core operational runtime rather than a cosmetic chat add-on. Agents handle mail triage, reply drafting, voice dialogs, inventory forecasting, and workflow automations. Critical requirements:
1. Provider neutrality: Default to high-accuracy reasoning models while supporting customer Bring-Your-Own-Key (BYOK) for OpenAI, Anthropic, Google Gemini, or local models.
2. Structured output generation with strict schema enforcement (Zod/JSON Schema).
3. Supervised autonomy levels (`suggest`, `approve`, `auto`) with an immutable human approval queue.
4. Robust defense against prompt injection from untrusted inbound emails, web documents, and transcripts.
5. Observability, token metering, spend caps, and evaluation harnesses in CI.

## Alternatives Considered
- **Direct Anthropic SDK calls:** Simple, but couples all code directly to one vendor and prevents BYOK.
- **LangChain / LlamaIndex:** Excessive abstraction bloat, slow startup times, and difficult to type-check strictly across monorepo boundaries.
- **Vercel AI SDK (`ai` package):** Standardized TypeScript interfaces for streaming, tool calling, and structured outputs (`generateObject`, `streamText`). Native support for Anthropic, OpenAI, Google, and Ollama providers with zero vendor lock-in.

## Decision
We implement a dedicated runtime in **`packages/agent-kit`** using the **Vercel AI SDK**:
1. **Model Defaults & Resolution:**
   - Default platform model: Anthropic Claude 3.5 Sonnet (`claude-3-5-sonnet-latest` or `claude-sonnet-4-20250514`).
   - Provider resolution checks tenant settings first (BYOK stored in `core_secrets` with envelope encryption). If no tenant key is supplied, platform-metered keys are used.
2. **Autonomy Framework:**
   - Every agent action evaluates an Autonomy Rule:
     - `suggest`: Agent produces draft and rationale; human must review and manually dispatch.
     - `approve`: Action lands in the tenant **Approval Queue**; human approves, edits, or rejects with one click.
     - `auto`: Action executes directly; notification sent to audit stream.
   - High-risk actions (financial transactions > $0, external emails to VIPs, stock write-offs) enforce `approve` by default.
3. **Tool Calling & Permission Isolation:**
   - Tools are exported by module manifests (e.g. `mail.sendReply`, `crm.createDeal`, `inv.checkStock`).
   - Each tool declares required permissions and risk level (`read`, `write`, `external-send`, `financial`).
   - The runtime validates that the tenant service identity possesses the requisite permissions before executing any tool.
4. **Security & Prompt Injection Guardrails:**
   - **Untrusted Ingress Quarantine:** All external text (email bodies, subjects, sender headers, web URLs, transcripts) is wrapped in strict XML data blocks (`<untrusted_user_input>`).
   - System prompts instruct models that content inside `<untrusted_user_input>` must never override instructions, grant permissions, or alter tool arguments.
   - Structured JSON schema validation rejects outputs that deviate from target schemas.
   - Loop and spam protection: Global kill switch per tenant, rate limits (e.g., max 1 auto-reply per thread, max 50 auto-replies/hour).
5. **Observability & Eval Harness:**
   - Every agent execution is persisted to `agent_runs` (prompt version, tokens, latency, cost in cents, retrieved citations, tool call traces).
   - CI runs an automated regression harness against a golden dataset of 100 benchmark scenarios before merging prompt or model updates.

## Consequences
### Positive
- Unified tool calling and streaming interface across all supported model providers.
- Strict isolation prevents prompt injection attacks from compromising internal databases or dispatching unauthorized communications.
- Complete auditability of agent decisions with full source citations.

### Negative / Trade-offs
- Model API updates require ongoing validation in CI to ensure schema adherence.
- Token costs for continuous eval test suites in CI require budgeted API keys.

## References
- Vercel AI SDK Core Documentation: https://sdk.vercel.ai/docs
- OWASP Top 10 for Large Language Model Applications: https://owasp.org/www-project-top-10-for-large-language-model-applications
- Anthropic Prompt Engineering Guidelines: https://docs.anthropic.com
