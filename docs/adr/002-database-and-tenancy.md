# ADR-002: Multi-Tenant Database Architecture and Row Level Security

**Status:** Accepted  
**Date:** 2026-11-02  
**Deciders:** Core Engineering Team

## Context
The platform is a multi-tenant business operating system hosting sensitive communications, CRM records, financial ledgers, and inventory balances. Key requirements include:
1. Complete data isolation between tenants (zero cross-tenant data leaks under any condition).
2. Cost-effective serverless operation on Vercel paired with a viable self-hosted Docker deployment path.
3. Integrated vector storage for knowledge retrieval (RAG) without running a separate vector database.
4. Robust transactional guarantees for stock ledger operations, financial journals, and event publishing.
5. Strict schema migrations committed to version control.

## Alternatives Considered
- **Database-per-tenant:** Highest isolation, but unmanageable connection overhead, slow migrations across hundreds of tenants, and high infrastructure cost on serverless.
- **Schema-per-tenant (Postgres schemas):** Moderate isolation, but high migration complexity, metadata bloat in Postgres catalogs, and poor compatibility with connection poolers.
- **Shared database, shared schema with Row Level Security (RLS) + App-Layer Filters:** Lowest operational overhead, instantaneous onboarding of new tenants, strong isolation guaranteed at the database engine level via Postgres RLS, and native compatibility with serverless connection pooling.

## Decision
We adopt a **shared PostgreSQL database with Row Level Security (RLS)**, powered by **Neon Postgres** for cloud deployment and standard PostgreSQL 16+ for self-hosted instances:
1. **ORM & Schema:** We use **Drizzle ORM** with SQL migrations committed under `packages/core/migrations` and module-specific migrations under `packages/modules/<module>/migrations`.
2. **Tenant Identifier:** Every table (except `core_tenants`) includes `tenant_id UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE`.
3. **Engine-Level Isolation (Postgres RLS):**
   - Every connection/transaction executes `SET LOCAL app.current_tenant_id = '<tenant_id>';`.
   - Every table has an enabled RLS policy:
     ```sql
     ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;
     CREATE POLICY tenant_isolation_policy ON <table_name>
       USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
       WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
     ```
4. **Defense in Depth (Application Layer):**
   - Drizzle query wrappers enforce `where(eq(table.tenantId, ctx.tenantId))` on all read and write queries. Even if an RLS session variable is omitted by misconfiguration, application-level assertions block cross-tenant leakage.
5. **Vector Search:** We use the native Postgres extension **`pgvector`** for semantic search and knowledge chunks (`vector(1536)`), indexed using HNSW (`m = 16`, `ef_construction = 64`) with cosine distance.
6. **Connection Pooling:** Serverless environments use Neon's HTTP / WebSocket driver with connection pooling enabled.

## Consequences
### Positive
- Strict security isolation enforced by PostgreSQL kernel logic.
- Single database schema simplifies migrations, backups, and operational monitoring.
- Native `pgvector` eliminates external vector database subscriptions and synchronizes vector updates within standard relational ACID transactions.
- Neon branching enables instantaneous database branching for pull request preview deployments.

### Negative / Trade-offs
- Superuser / migration connections bypass RLS by default; background worker jobs must explicitly set `app.current_tenant_id` before querying.
- Complex analytics queries spanning millions of rows require composite indexes on `(tenant_id, ...)` to maintain index-scan performance.

## References
- Neon Serverless Postgres Documentation: https://neon.tech/docs
- PostgreSQL Row Security Policies: https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- pgvector GitHub & Documentation: https://github.com/pgvector/pgvector
- Drizzle ORM Documentation: https://orm.drizzle.team
