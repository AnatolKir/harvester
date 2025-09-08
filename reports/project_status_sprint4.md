# TikTok Domain Harvester – Project Status (Sprint 4 Planning)

## Overview

A comment-first system that discovers U.S. promoted TikTok videos, harvests comments, extracts domains, and surfaces insights in a Next.js dashboard. MVP prioritizes speed-to-market: comments-only, 1–2 pages per video, Supabase for storage, Inngest for jobs, and Upstash Redis for rate limiting.

- Frontend/API: Next.js 14 (App Router, TypeScript, Tailwind, shadcn/ui)
- Database: Supabase (Postgres + RLS, SQL views/RPCs)
- Jobs: Inngest (cron + retries, webhook to Next.js)
- Rate limiting: Upstash Redis (token bucket)
- Auth: Supabase Auth (email login)

## What’s Done (Sprints 1–3)

- Foundations (S1)
  - Next.js app scaffolded; Tailwind + shadcn/ui.
  - Supabase schema and RLS; core tables: `video`, `comment`, `domain`, `domain_mention`.
  - Route Handlers for `/api/domains`, `/api/stats`, worker webhook; env validation.
  - Upstash Redis token bucket utilities.
  - Inngest cron jobs initial setup; Makefile + deployment docs.
- MCP Pivot & Pipeline (S2)
  - Replaced Playwright proxy with MCP (Bright Data) via typed wrappers.
  - Updated Inngest discovery/harvest to call MCP; idempotent upserts.
  - Observability endpoints for rate-limit metrics; security wrappers.
  - Worker marked legacy; docs updated.
- Hardening & UI Wiring (S3)
  - Token bucket tuning, retries, idempotency checks.
  - SSR UI powered by SQL views; no mocks.
  - Admin APIs for jobs/kill switch/config/DLQ; Inngest Cloud readiness.
  - DB indexes/constraints added; schema docs updated.

References: `web/docs/ENVIRONMENT.md`, `INNGEST_SETUP.md`, `supabase/schema_documentation.md`, `web/docs/api-reference.md`.

## What’s Next (Sprint 4)

Focus: MVP launch readiness, operator UX, and minimal enrichment.

1. Domain Detail page (SSR)
   - `app/domains/[id]/page.tsx` with mentions, video links, small time series; `loading.tsx`, `error.tsx`, `generateMetadata()`.
2. Videos list page (SSR)
   - `app/videos/page.tsx` with domain counts, scrape status, pagination, search.
3. Admin UI
   - Kill Switch controls; Job Metrics dashboard; DLQ management; Logs viewer (RBAC enforced).
4. Slack Alerting (v0)
   - Alerts for kill switch, discovery/harvest gaps, success rate <70%, DLQ ≥10.
5. CSV exports
   - `/api/domains/export` and `/api/domains/[id]/mentions/export` (streamed CSV).
6. Inngest backfill job
   - Backfill recent days from CCL with strict RPM; checkpointing in `system_config`.
7. Minimal HTTP enrichment
   - HEAD/GET verifier with low RPM; store status/server header in `domain.metadata` and `verified_at`; surface in detail page.
8. Observability hardening
   - Standard error/headers; correlation IDs across `/api/*` and jobs; admin rate-limit chart.
9. Security & API polish
   - Stronger admin origin checks, RBAC guard, audit logs for admin actions.
10. Docs & runbooks

- Incident runbooks; refreshed environment/deploy docs; Operator Guide in `web/README.md`.

See prompts in `prompts/sprint4/` (32–45) for task-level detail and acceptance.

## Risks & Assumptions

- MCP provider changes (schema/availability) – wrappers and retries mitigate.
- Rate limit bans – token bucket pacing and jitter applied; backoff on failure.
- Data volume growth – SQL views and indexes in place; consider materialized views post-MVP.
- Slack/alerts noise – thresholds tuned conservatively; feature flag available.

## How to Run & Operate

- Setup: follow `web/docs/ENVIRONMENT.md` and `DEPLOYMENT.md`.
- Jobs & monitoring: `INNGEST_SETUP.md` for health checks, kill switch, DLQ.
- Admin UI: `/admin/*` (RBAC by `ADMIN_EMAILS`).
- Exports: see API reference for CSV endpoints.

## Ownership

- Primary: Solo engineer (AI-assisted).
- Ops: Use runbooks (rate limit saturation, MCP outage, DLQ growth) in `web/docs/`.

---

This report summarizes current status and the Sprint 4 backlog geared toward MVP launch readiness and safe operations.
