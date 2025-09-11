## MCP-based Discovery/Harvest (Sprint 2)

## Domain Harvesting v2 (Sprint 9)
- Discovery broadens search (TikTok) to maximize recall; promotion status is validated later.
- Gateway enrichment fetches video and profile pages via Bright Data and extracts all links.
- Store as‑seen variants: `raw_url`, `final_url`, `raw_host`, `final_host`. No normalization/merging.
- Dedupe key: `(video_id, raw_url)` only. Keep typo‑like hosts intentionally.
- Rate limiting via existing envs: `DISCOVERY_RPM`, `HTTP_ENRICH_RPM` (defaults 30/60/30). Use jitter and backoff on 429.
- Provide a daily trending query over `outbound_links` for ops.

- Primary data acquisition runs inside Inngest jobs (Node) using a lightweight MCP client.
- Bright Data MCP is the initial provider; the fetch interface is pluggable for future sources.
- The former Playwright worker path is considered legacy and retained only for rollback (see `worker/README_LEGACY.md`).
- Environment variables include MCP_BASE_URL and BRIGHTDATA_MCP_API_KEY (alias: API_TOKEN).

# Cloud Deployment – 2025-09 hardening snapshot

The current production setup runs entirely in the cloud (no local dependencies):

- Web (Next.js 15) on Vercel, project root: `web/`.
- Jobs on Inngest via the `/api/inngest` serve endpoint (Node runtime).
- Database on Supabase; Redis (rate limits) on Upstash.
- Optional Python worker on Railway is retained for contingency and advanced scraping, but the primary pipeline is Inngest‑based.

Key decisions and guardrails:

- Next.js config:
  - `serverExternalPackages` used; `experimental.externalDir=true` enabled for monorepo‑safe imports.
  - `outputFileTracingRoot` pinned to repo root to silence monorepo warnings.
  - TypeScript strict build enforced (`ignoreBuildErrors=false`).
  - Route handlers that import Node APIs declare `export const runtime = 'nodejs'` and `export const dynamic = 'force-dynamic'` where static analysis caused build‑time side effects.

- Supabase usage (TypeScript hygiene):
  - Always type result sets with `.returns<...>()` immediately after `.select(...)`.
  - Guard all `.single()`/`.maybeSingle()` before field access.
  - For `.rpc(...)` without generated types: cast args `as unknown as never` and provide minimal result typing with `.returns<...>()`.
  - Server client creation accepts `SUPABASE_URL` fallback: `(SUPABASE_URL || NEXT_PUBLIC_SUPABASE_URL)`.

- App Router typing:
  - Pages use `searchParams?: Promise<Record<string, string | string[] | undefined>>` and await once at the top.
  - Route handlers accept `{ params: Promise<{ ... }>; }` and await once.

- Inngest integration:
  - Serve endpoint is `GET/POST /api/inngest` in `web/src/app/api/inngest/route.ts`.
  - Vercel integration is used with path `/api/inngest`; custom domain points to `https://data.highlyeducated.com`.
  - Environment keys: `INNGEST_SIGNING_KEY` (serve introspection) and `INNGEST_EVENT_KEY` (explicitly wired in `web/inngest/client.ts`).

- Concurrency & schedules (initial production defaults):
  - Comment harvesting: 30
  - Domain extraction from comments: 50
  - HTTP enrichment: 10
  - DNS/WHOIS enrichment: 10
  - Discovery backfill/manual: on demand; scheduled discovery: `*/10 * * * *`
  - Materialized views refresh: `*/5 * * * *`
  - Health check: `*/5 * * * *`; maintenance cleanup: `0 2 * * 0`

- Global rate limits (Upstash token buckets / env):
  - `DISCOVERY_RPM=30`, `COMMENTS_RPM=60`, `HTTP_ENRICH_RPM=30`
  - Raising Inngest concurrency above token limits won’t increase throughput; scale tokens first.

- Safety:
  - Kill switch stored in `system_config` (`key=kill_switch_active`).
  - Admin API routes are Node runtime and check for presence of Supabase admin envs; they return safe fallbacks during page‑data collection.

# Architectural Guidelines – TikTok Domain Harvester

## Philosophy

- **MVP-first**: Deliver a working system quickly by narrowing scope (U.S. promoted ads, comments only).
- **Simplicity over abstraction**: Avoid over-engineering (no Temporal, no Timescale, no gRPC).
- **Composable pieces**: Each component (UI, worker, scheduler) is independently replaceable.
- **Schema-first development**: DB schema and SQL views drive the API/UI.
- **Auditability & safety**: Always log, rate-limit globally, and provide kill switches.

---

## System Overview

```
          +----------------------+
          | TikTok Ad Discovery  |
          | (Commercial Library) |
          +----------+-----------+
                     |
                     v
           +------------------+
           | Comment Harvester|  (Python worker on Railway/Fly)
           +------------------+
                     |
             domain mentions
                     v
       +------------------------+
       | Supabase (Postgres/RLS)|
       +------------------------+
            ^             ^
            |             |
            |             v
    +-------+--+     +------------+
    | Next.js UI|     | Inngest    |
    | (Vercel)  |     | (cron/jobs)|
    +-----------+     +------------+
```

---

## Cloud Runtime Topology

- **Web (Vercel)**: Next.js app (`/web`), connects directly to Supabase. No direct dependency on the worker by default.
- **Worker (Railway)**: Python + Playwright (`/worker`), writes to Supabase, exposes health on port 8080 (`/live`, `/ready`, `/health`).
- **Jobs (Inngest)**: Cron/triggered jobs (`/inngest`) for discovery, enrichment, refresh.
- **Database (Supabase)**: Single source of truth; UI reads via views, worker writes rows.
- Optional: Front Railway with Cloudflare for custom domain + TLS + caching/DDOS.

### Web ↔ Worker Integration

- Default: decoupled via database; no synchronous calls required.
- Optional UI → Worker: configure `WORKER_WEBHOOK_URL` (Vercel) to call a worker endpoint for manual triggers. Secure with bearer token.
- Optional Worker → UI: emit POSTs to a web route (e.g., `/api/worker/webhook`) with `Authorization: Bearer <token>` for event notifications. (Add route when needed.)
- Observability: Railway logs + health endpoints; Slack alerts (optional) from the web app.

---

## Component Guidelines

### Database (Supabase / Postgres)

- **Schema-first**: lock tables early, design around `video`, `comment`, `domain`, `domain_mention`.
- **Views over logic**: create SQL views for UI (e.g., `v_domains_new_today`).
- **Row-Level Security**: enforce read-only for authenticated users; service role key for worker writes.
- **Indexes**: time-based (scraped_at, last_seen) and domain-based for fast lookups.

### API (Next.js Route Handlers)

- **Keep thin**: act as a passthrough to Supabase (REST/SQL views).
- **REST not tRPC**: faster to build, less boilerplate.
- **No business logic** in API layer; all heavy lifting is in worker/DB.

### Worker (Python on Railway/Fly)

- **Responsibilities**: discovery → comment fetch → domain extraction → inserts.
- **Early stop**: max 1–2 pages per video to cut costs.
- **Global token bucket**: use Upstash Redis to govern rate (not per worker).
- **Isolation**: crash in worker should not impact UI; retries handled by scheduler.

### Scheduler (Inngest/Trigger.dev)

- **Cron jobs only**: discovery every 10 min, refresh hourly.
- **Fan-out**: send batches of video IDs to worker via webhook.
- **Retries**: let scheduler handle retries, not the worker.

### UI (Next.js on Vercel)

- **Pages**: Domains overview, Domain detail, Filters.
- **Source of truth**: Supabase SQL views, not custom aggregations in JS.
- **Minimal state**: fetch server-side (SSR) to reduce client complexity.

---

## Operational Guidelines

- **Kill Switch**: feature flag in worker to halt scraping by region.
- **Monitoring**: log errors, track domains/day, comments/day, pipeline success %.
- **Testing**: synthetic comments with known domains for validation; unit tests for extraction.
- **CI/CD**: GitHub Actions → Vercel (web), Railway/Fly (worker).

---

## Non-Goals for MVP

- No enrichment (DNS/WHOIS/HTTP).
- No multi-region or organic influencer tracking.
- No TimescaleDB or heavy timeseries ops.
- No complex auth providers (email only).

---

## Roadmap Alignment

- MVP: focus on speed and proof of value.
- V1+: add enrichment, scoring, exports, alerts.
- Future: multi-region, multi-language, scaling infra if traction proves out.
