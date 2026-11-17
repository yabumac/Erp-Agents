# ADR-012: Quality Assurance, Automated Testing Pyramid, and Agent Evaluation Harness

**Status:** Accepted  
**Date:** 2026-11-02  
**Deciders:** Core Engineering Team

## Context
A business operating system managing stock balances, customer inboxes, phone calls, and accounting journals cannot tolerate regressions:
1. Cross-tenant data isolation must be mathematically and empirically proven.
2. Every module manifest must satisfy the module contract without breaking host runtime expectations.
3. Asynchronous jobs (10,000-recipient batch campaigns, stock valuation runs) must guarantee idempotency and recover seamlessly from mid-run crashes.
4. AI agents must be protected against prompt injection attacks and performance degradation across prompt revisions.

## Alternatives Considered
- **Manual QA & Post-Deployment Monitoring:** Inadequate for enterprise software; human testing cannot catch complex multi-tenant RLS race conditions or prompt regressions.
- **Heavy End-to-End Suite Only (Cypress/Playwright only):** Slow, brittle, expensive, and fails to test granular database isolation policies or edge-case financial journal equations.
- **Automated Testing Pyramid + Contract Testing + Agent Eval Harness:** Fast unit tests for pure domain logic, integration tests against real PostgreSQL instances with RLS enabled, contract tests validating module manifests and provider adapters, Playwright tests for critical user journeys, and a dedicated LLM evaluation harness.

## Decision
We mandate a comprehensive **5-Tier Quality Gate** enforced on every pull request in CI:

```
          ▲
         / \     Tier 5: Agent Eval Harness (Golden datasets, injection resistance)
        /---\    Tier 4: Playwright E2E (Critical user flows: onboard, triage, invoice)
       /-----\   Tier 3: Module Contract & Provider Adapter Tests (Mock Service Worker)
      /-------\  Tier 2: Integration Tests (Real Postgres with RLS, Drizzle, Trigger jobs)
     /---------\ Tier 1: Unit & Type Tests (Vitest, TypeScript strict, Linting)
```

### 1. Tier 1: Unit & Type Checks
- `pnpm type-check`: Strict TypeScript (`noImplicitAny`, `exactOptionalPropertyTypes`). Zero unchecked `any` allowed without explicit inline rationale.
- `pnpm lint`: ESLint rules prohibiting illegal cross-module imports and verifying import hygiene.
- Pure function testing for math, minor-currency conversions, unit-of-measure conversions, and tokenizers.

### 2. Tier 2: Multi-Tenant Integration Tests
- Executed via **Vitest** against an active PostgreSQL container with the `pgvector` extension.
- **Tenant Isolation Proof Test Suite (`packages/core/test/isolation.test.ts`):**
  - Creates Tenant A and Tenant B.
  - Inserts contacts, threads, invoices, and stock movements for Tenant A.
  - Executes all query interfaces as Tenant B:
    - Direct Drizzle queries with Tenant B context.
    - Raw SQL queries with `SET LOCAL app.current_tenant_id = 'tenant_b'`.
    - Cross-tenant ID query attempts (e.g. `SELECT * FROM crm_deals WHERE id = '<tenant_a_deal>'`).
  - Asserts that Tenant B receives 0 rows and zero error leaks.
- Transactional rollback tests verifying double-entry journal balance enforcement (`debit = credit`).

### 3. Tier 3: Contract & Provider Adapter Tests
- **Module Contract Suite (`packages/core/test/module-contract.test.ts`):**
  - Runs automatically against every package under `packages/modules/*`.
  - Asserts manifest compliance: Table prefixes (`mail_`, `inv_`), unique permission names, valid Zod settings schemas, and declared route definitions.
- **Provider Mocking via Mock Service Worker (MSW):**
  - Gmail API, Microsoft Graph, Twilio Voice, and Stripe API requests are mocked at the network layer to test error handling, rate-limit backoff, and idempotency recovery without consuming live API credits.

### 4. Tier 4: Playwright End-to-End Journeys
- Headless browser tests simulating real user workflows:
  1. New tenant registration and brand-pack initialization.
  2. Inbound email receipt → AI triage categorization → Human approval → Send reply.
  3. Batch email campaign dispatch (10,000 recipients simulated) with simulated worker crash and resume verification (zero duplicate sends).
  4. Stock receipt → Purchase order creation → Stock ledger update → Invoice generation → Stripe payment link payment.

### 5. Tier 5: Agent Evaluation & Security Harness
- Located in `packages/agent-kit/evals`:
  - **Golden Dataset:** 100 realistic customer inquiries across sales, billing, technical support, spam, and complaints.
  - **Automated Scoring:** Evaluates category accuracy, urgency detection, retrieval citation relevance, and tone alignment.
  - **Prompt Injection Defense Suite:** 50 adversarial attack vectors (attempts to extract system prompts, override tool permissions, exfiltrate API keys, or trigger unauthorized financial transfers via email bodies and attachment filenames). CI fails if any jailbreak succeeds.

## Consequences
### Positive
- Guarantees zero cross-tenant data leaks and prevents accidental module contract breaking changes.
- Eliminates fear of prompt regressions when updating models or tuning agent personas.
- Every release is verifiable against real database engines and provider contracts.

### Negative / Trade-offs
- Full CI test runs take 4-6 minutes; mitigated by Turborepo incremental pipeline caching.
- Agent evaluation runs incur small LLM API costs in CI; run on main branch merges and PRs touching `packages/agent-kit`.

## References
- Vitest Test Runner: https://vitest.dev
- Playwright End-to-End Testing: https://playwright.dev
- Mock Service Worker (MSW): https://mswjs.io
- OWASP Prompt Injection Prevention: https://genai.owasp.org
