# Prompt 48: Materialized Views and Performance Baseline

## Role

You are a Senior Data/DB Engineer optimizing read performance for dashboards/exports.

## Goal

Create optional materialized views for heavy UI queries and add a refresh job so the UI remains fast under load without sacrificing freshness.

## Deliverables

- SQL: `supabase/migrations/XXXX_matviews.sql` defining:
  - `mv_domains_overview` (domain, total_mentions, first_seen, last_seen)
  - `mv_videos_with_domains`
- Inngest job: `inngest/jobs/mv-refresh.ts` (cron: every 5 min)
- Fallback: UI keeps using normal views when matviews are absent

## Requirements

- Safe `CREATE MATERIALIZED VIEW IF NOT EXISTS ...` and matching `REFRESH MATERIALIZED VIEW CONCURRENTLY`
- Indexes on matviews for filter/order columns
- Inngest job gated by env flag `MATVIEWS_ENABLED`

## Steps

1. Author SQL to create matviews and indexes.
2. Add Inngest function that refreshes matviews concurrently (catch errors, alert on failure).
3. Add small helper in API layer to select from matviews when enabled; otherwise use normal views.

## Acceptance Criteria

- Matviews refresh on schedule (5 min) when enabled
- UI/API continue to work when matviews are disabled/missing
- p95 latency for domains list < 150ms on 10k rows (local benchmark)

## Documentation & Commit

```bash
git add supabase/migrations/XXXX_matviews.sql inngest/jobs/mv-refresh.ts web/src/lib/db/mv.ts
git commit -m "perf(db): materialized views with scheduled refresh"
git push
```
