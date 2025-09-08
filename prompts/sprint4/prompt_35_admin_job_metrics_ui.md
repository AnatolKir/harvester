# Prompt 35: Admin UI – Job Metrics Dashboard

## Role

You are a Senior Observability Engineer with UI skills (Next.js + charts).

## Goal

Build `/admin/jobs` SSR page to visualize discovery/harvesting metrics (24h, 7d), success rates, p95 duration, and recent executions using existing admin APIs.

## Deliverables

- `web/src/app/admin/jobs/page.tsx` (SSR)
- Small chart components (reuse existing UI primitives)

## Requirements

- Fetch metrics via `/api/admin/jobs` GET with query params.
- Cards: success rate, last successful run, DLQ size, in-progress jobs.
- Charts: jobs/hour, duration p50/p95.
- Respect admin RBAC; error and loading states included.

## Steps

1. Implement server-side fetching and data transforms.
2. Render responsive cards and charts (mobile-first).
3. Link to DLQ and Health pages.

## Acceptance Criteria

- Metrics load without mocks; time range switches work.

## Documentation & Commit

- Update operator docs in `INNGEST_SETUP.md`.
- Commit and push:

```bash
git add web/src/app/admin/jobs INNGEST_SETUP.md
git commit -m "feat(admin): job metrics dashboard (SSR) with charts and RBAC"
git push
```
