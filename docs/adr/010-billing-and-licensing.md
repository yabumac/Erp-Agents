# ADR-010: Billing Architecture, Entitlements, and Self-Hosted Licensing

**Status:** Accepted  
**Date:** 2026-11-02  
**Deciders:** Core Engineering Team & Business Operations

## Context
The platform must support two distinct commercial models:
1. **Multi-Tenant SaaS:** Monthly/annual subscriptions via Stripe, featuring a hybrid pricing model:
   - Base plan (Core + N included seats).
   - Per-module add-ons (e.g. Mail module +$29/mo, Voice module +$49/mo).
   - Usage tiers and metered billing (emails sent, telephony minutes, agent AI runs).
   - Self-service Stripe Customer Portal for plan management, payment methods, and invoices.
2. **Self-Hosted Enterprise / Agency Installs:** Customers deploying via Docker on their own infrastructure without a permanent Stripe internet connection. Requires offline-verifiable, tamper-proof license files.

## Alternatives Considered
- **Pure Seat-Based Billing:** Simple, but fails to capture value from high-volume automated workloads (batch campaigns, AI voice agents).
- **Pure Usage Billing:** Unpredictable for small business buyers; difficult for sales forecasting.
- **Hybrid Pricing (Base + Modules + Usage):** Matches customer willingness to pay; customers only pay for modules they activate.

## Decision
We implement a unified **Entitlements Engine** in `@repo/core` with dual enforcement adapters:

### 1. Unified Entitlements Schema (`core_entitlements`)
- Every tenant maintains an active entitlement state:
  ```typescript
  export interface TenantEntitlements {
    planId: string;
    maxSeats: number;
    enabledModules: string[]; // ["mail", "voice", "crm"]
    usageAllowances: {
      emailsPerMonth: number;
      callMinutesPerMonth: number;
      agentRunsPerMonth: number;
      storageBytes: number;
    };
    expiresAt?: string;
    isTrial: boolean;
  }
  ```
- Entitlements are evaluated by core middleware on every request and API route. If a tenant attempts to enable a module not included in their entitlements, the action is rejected with `403 Forbidden (ModuleNotEntitled)`.

### 2. SaaS Billing Engine (`packages/providers/stripe`)
- Integrates with Stripe Billing and Stripe Invoicing.
- **Webhooks:** Ingests `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, and `invoice.payment_failed`.
- **Metered Usage Reporting:** Daily aggregated records from `core_usage_records` are reported to Stripe Metered Billing API using idempotency keys.
- **Customer Portal:** Embeds Stripe Customer Portal links directly into the tenant Admin Billing settings screen.

### 3. Self-Hosted License Mode (`packages/core/src/licensing`)
- Self-hosted instances run with `LICENSE_MODE=offline`.
- Platform owner generates a cryptographically signed license file using an RSA-4096 private key:
  ```json
  {
    "licenseId": "lic_987654321",
    "customer": "Acme Corp",
    "issuedAt": "2026-11-01T00:00:00Z",
    "expiresAt": "2027-11-01T00:00:00Z",
    "maxSeats": 50,
    "modules": ["mail", "voice", "crm", "inventory", "invoicing", "knowledge", "automations"],
    "signature": "MEQCIA..."
  }
  ```
- The application embeds the corresponding RSA public key. At startup and on a daily schedule, the system verifies:
  1. Cryptographic signature validity.
  2. Expiration date against system clock (with NTP rollback defense).
  3. Active seat count does not exceed `maxSeats`.
- If invalid or expired, the UI transitions into a read-only grace period (14 days) before locking administrative actions.

## Consequences
### Positive
- Flexible monetization: Can sell SaaS self-serve, enterprise annual contracts, and on-premises licenses from one codebase.
- Entitlement checks are centralized in core middleware, preventing unauthorized module activation.
- Offline license verification requires zero phone-home network connectivity, satisfying strict enterprise security reviews.

### Negative / Trade-offs
- Private signing key for self-hosted licenses must be secured rigorously in external key management infrastructure.
- Usage metering requires reliable daily aggregation jobs to prevent under-reporting.

## References
- Stripe Subscriptions & Metered Billing Guide: https://stripe.com/docs/billing/subscriptions/metered-billing
- RFC 8017: PKCS #1 RSA Cryptography Specifications: https://datatracker.ietf.org/doc/html/rfc8017
