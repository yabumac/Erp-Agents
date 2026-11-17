# ADR-003: Authentication, Session Management, and Role-Based Access Control (RBAC)

**Status:** Accepted  
**Date:** 2026-11-02  
**Deciders:** Core Engineering Team

## Context
A commercial white-label business operating system requires:
1. Multi-tenant authentication with organization/workspace switching.
2. Multiple authentication methods: Email/password, magic link, Google OAuth, Microsoft OAuth (Entra ID), and TOTP 2FA.
3. User invitation workflows with role assignments and expiration tokens.
4. Granular, manifest-driven RBAC supporting system roles (`Owner`, `Admin`, `Manager`, `Agent`, `Viewer`) and tenant-custom roles.
5. Record-level and field-level permissions (e.g., sales agents see only their deals; financial details masked for non-finance roles).

## Alternatives Considered
- **Auth.js (NextAuth v5):** Historically dominant, but v5 has had ongoing beta instability, lacks built-in multi-tenant organization primitives, and requires extensive custom code to manage RBAC and team invitations.
- **Clerk / WorkOS:** Excellent multi-tenant and enterprise SSO features, but high SaaS pricing per active user, vendor lock-in, and cannot be self-hosted in an on-premises Docker environment.
- **Better Auth:** Modern TypeScript-native authentication framework designed specifically for App Router and edge runtimes. Offers built-in organization/multi-tenancy plugins, 2FA, OAuth providers, invitation flows, and full schema control with Drizzle ORM. Fully self-hostable.

## Decision
We select **Better Auth** with custom RBAC middleware integrated into `@repo/core`:
1. **Authentication Core:**
   - Better Auth handles sessions, passwords (Argon2id), magic links, OAuth callbacks (Google, Microsoft), and TOTP 2FA.
   - Sessions are cookie-based (HTTP-only, Secure, SameSite=Lax) with database-backed session revocation.
2. **Multi-Tenancy & Organizations:**
   - A user belongs to one or more tenants (`core_users` join via tenant memberships).
   - Session tokens store active `tenant_id`, validated on every request.
3. **Permission Schema:**
   - Permissions are formatted as hierarchical strings: `<module>.<resource>.<action>` (e.g., `mail.campaign.send`, `inv.stock.adjust`, `fin.invoice.approve`).
   - Standard roles:
     - `Owner`: Unrestricted access to tenant settings, billing, modules, and data.
     - `Admin`: Full access to tenant data and module configuration; cannot delete tenant or alter billing.
     - `Manager`: Full operational access across enabled modules; can approve agent actions.
     - `Agent`: Daily operational access (triage mail, create quotes, update deals, adjust stock).
     - `Viewer`: Read-only access to records across enabled modules.
   - Custom roles allow tenants to compose arbitrary permission sets drawn from declared module manifests.
4. **Service Identity:**
   - Autonomous background agents execute under dedicated service identities scoped strictly to the host tenant with explicit permission sets, preventing privilege escalation.
5. **Access Control Enforcement:**
   - Evaluated at UI navigation, App Router middleware (`apps/web`), API endpoints, and agent tool invocation handlers.

## Consequences
### Positive
- Fully self-hostable authentication compatible with both Vercel and Docker Compose.
- Zero per-seat auth vendor tax.
- Native integration with Drizzle ORM schemas and Postgres RLS context.

### Negative / Trade-offs
- Better Auth is a newer library compared to NextAuth; custom adapters must be tested against patch updates.

## References
- Better Auth Documentation: https://www.better-auth.com
- OWASP Session Management Cheat Sheet: https://cheatsheetseries.owasp.org
- NIST Special Publication 800-63B: Digital Identity Guidelines
