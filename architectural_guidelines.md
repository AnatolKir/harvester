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
