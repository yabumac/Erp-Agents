# ADR-001: Monorepo Architecture and Build Tooling

**Status:** Accepted  
**Date:** 2026-11-02  
**Deciders:** Core Engineering Team

## Context
The platform requires a modular, white-label business operating system composed of:
- Multiple user-facing applications (`apps/web` for Next.js App Router UI/API, `apps/worker` for self-hosted background workers).
- Shared domain kernels (`packages/core` for tenancy, RBAC, event bus, audit, settings, entitlements).
- Reusable UI design system (`packages/ui`).
- Extensible AI runtime (`packages/agent-kit`).
- Decoupled provider adapters (`packages/providers/*`: Gmail, Microsoft Graph, IMAP, Twilio, Resend, Stripe, LLM, STT/TTS, S3 storage).
- Independent business modules (`packages/modules/*`: Mail, Voice, CRM, Inventory, Invoicing, Knowledge, Automations).
- Customer brand packs (`packages/brand/*`).

We need a monorepo build system and package manager that provides:
1. Strict dependency isolation without phantom dependencies.
2. Fast, incremental caching for local builds and CI pipelines.
3. Native compatibility with Vercel deployment and Docker containerization.
4. Minimal configuration overhead for adding new modules.

## Alternatives Considered
- **Turborepo + pnpm Workspaces:** Fast Rust-based build caching, zero-config workspace pipeline definitions, native symlink resolution with pnpm, direct Vercel remote cache integration.
- **Nx:** Powerful dependency graph analysis and code generators, but adds significant configuration ceremony, complex workspace abstraction, and higher maintenance burden.
- **npm/yarn workspaces:** Lacks high-performance remote and local computation caching; yarn berry PnP creates ecosystem compatibility issues with native Node modules.

## Decision
We adopt **pnpm workspaces** with **Turborepo** (`turbo`):
1. **pnpm** enforces strict node_modules resolution through symlinked content-addressable storage, preventing phantom dependencies and saving disk footprint.
2. **Turborepo** orchestrates tasks (`build`, `test`, `lint`, `type-check`, `db:generate`, `module:contract-test`) with pipeline topological ordering and content-hashed caching.
3. Every package in `packages/*` and `apps/*` uses TypeScript with shared base tsconfig presets (`@repo/tsconfig`).
4. Module generator CLI (`pnpm module:create <id>`) scaffolds new modules conforming to the standard monorepo structure.

## Structure
```text
.
├── apps/
│   ├── web/                 # Next.js 15 App Router (Web Shell, Host & API)
│   └── worker/              # Standalone background worker (Docker / BullMQ)
├── packages/
│   ├── core/                # Tenancy, RLS context, RBAC, events, audit, settings
│   ├── ui/                  # Design system, shadcn/ui primitives, theme tokens
│   ├── agent-kit/           # Agent runtime, tool runner, guardrails, eval harness
│   ├── providers/           # Provider adapter interfaces and implementations
│   ├── modules/             # Manifest-driven business modules
│   ├── brand/               # Brand packs (tokens, assets, personas, templates)
│   └── tsconfig/            # Shared TypeScript configuration
├── docs/                    # Architecture, ADRs, module contracts, runbooks
├── turbo.json               # Pipeline configuration
└── pnpm-workspace.yaml      # Monorepo workspace definitions
```

## Consequences
### Positive
- Strict dependency boundaries prevent circular or illegal module cross-imports.
- Pipeline caching accelerates CI runs from minutes to seconds.
- Modular workspace layout allows shipping `apps/web` to Vercel and `apps/worker` to Docker without code duplication.

### Negative / Trade-offs
- Windows developer environments require pnpm package installations to be executed with sandbox bypass when adding global native bindings.
- Developers must maintain package-level `package.json` dependencies accurately.

## References
- Official Turborepo documentation: https://turbo.build/repo/docs
- pnpm Workspace specification: https://pnpm.io/workspaces
