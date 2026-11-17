# ADR-011: Dual Deployment Targets: Vercel Cloud and Self-Hosted Docker

**Status:** Accepted  
**Date:** 2026-11-02  
**Deciders:** Core Engineering Team & DevOps

## Context
The platform must support two distinct deployment topologies without maintaining separate codebases or branches:
1. **Target A: SaaS on Vercel + Managed Cloud Services**
   - Zero-ops management, continuous global edge CDN delivery, automatic branch previews for pull requests.
   - Leverages managed services: Neon (serverless Postgres), Trigger.dev (serverless background tasks), Resend (bulk email), LiveKit Cloud (realtime voice WebRTC/SIP), AWS S3 / Cloudflare R2 (object storage).
2. **Target B: On-Premises Self-Hosted via Docker Compose**
   - High data sovereignty for enterprise customers, privacy-conscious clients, or air-gapped corporate intranets.
   - Uses self-contained or private infrastructure: PostgreSQL 16 container, Redis container, BullMQ worker (`apps/worker`), local SMTP/minio storage, self-hosted LiveKit server.

## Decision
We implement a **Dual-Target Runtime Architecture** governed by environment configuration:

### Architecture Matrix
| Component | Target A (Vercel Cloud) | Target B (Docker Compose) |
|---|---|---|
| **Web Shell / API** | Vercel Serverless Functions (`apps/web`) | Next.js Standalone Node Server container |
| **Background Runner** | Trigger.dev Cloud Orchestrator | `apps/worker` Node process with BullMQ |
| **Database** | Neon Serverless Postgres (`@neondatabase/serverless`) | PostgreSQL 16 container (`pgvector/pgvector:pg16`) |
| **Cache & Queues** | Upstash Redis (if needed) / Trigger engine | Redis 7 Alpine container |
| **File Storage** | AWS S3 / Cloudflare R2 (`@aws-sdk/client-s3`) | MinIO container or Local Disk Volume adapter |
| **Realtime Voice** | LiveKit Cloud + Twilio SIP | Self-Hosted LiveKit Server + Twilio/FreePBX SIP |
| **Email Delivery** | Resend API / Amazon SES | Postfix / Local SMTP Relay / Mailpit (dev) |
| **Licensing** | Stripe Subscriptions (`LICENSE_MODE=saas`) | RSA Signed License File (`LICENSE_MODE=offline`) |

### Configuration Switch
The runtime switches providers via environment variables declared in `.env`:
```bash
DEPLOY_TARGET=vercel # or "docker"
DATABASE_URL=postgres://...
STORAGE_PROVIDER=s3 # or "local"
JOB_PROVIDER=trigger # or "bullmq"
LICENSE_MODE=saas # or "offline"
```

### Docker Compose Composition (`docker-compose.yml`)
```yaml
version: '3.8'
services:
  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
    ports: ["3000:3000"]
    environment:
      - DEPLOY_TARGET=docker
      - DATABASE_URL=postgres://app:secret@db:5432/platform
      - REDIS_URL=redis://redis:6379
  worker:
    build:
      context: .
      dockerfile: apps/worker/Dockerfile
    environment:
      - DEPLOY_TARGET=docker
      - DATABASE_URL=postgres://app:secret@db:5432/platform
      - REDIS_URL=redis://redis:6379
  db:
    image: pgvector/pgvector:pg16
    volumes: [postgres_data:/var/lib/postgresql/data]
    environment:
      - POSTGRES_DB=platform
      - POSTGRES_USER=app
      - POSTGRES_PASSWORD=secret
  redis:
    image: redis:7-alpine
    volumes: [redis_data:/data]
volumes:
  postgres_data:
  redis_data:
```

## Consequences
### Positive
- Single codebase serves 100% of both multi-tenant SaaS customers and on-premises enterprise clients.
- Clean provider abstractions isolate application code from infrastructure dependencies.
- Local development is instantaneous using Docker Compose or `vercel dev`.

### Negative / Trade-offs
- CI must validate both deployment targets (testing migrations and provider adapters against both Neon driver and raw PostgreSQL).
- Docker Compose images require multi-stage optimization to keep container footprint under 300MB.

## References
- Next.js Standalone Output Mode: https://nextjs.org/docs/app/api-reference/next-config-js/output
- Docker Multi-Stage Builds: https://docs.docker.com/build/building/multi-stage/
- Neon Serverless Connection Pooling: https://neon.tech/docs/connect/connection-pooling
