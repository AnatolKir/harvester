# Prompt 37: Admin UI – System Logs Viewer

## Role

You are a Senior Observability Engineer implementing log visibility in UI.

## Goal

Build `/admin/logs` SSR page to tail recent `system_logs`, filter by level/job/type, and link to related entities.

## Deliverables

- `web/src/app/admin/logs/page.tsx` (SSR)

## Requirements

- Admin RBAC
- Filters: level (info/warn/error), jobType, timeframe, correlationId
- Show correlation IDs and link to jobs/domains/videos when present
- Auto-refresh (server or client polling at low frequency)

## Steps

1. Query `system_logs` with filters; paginate.
2. Render table; link out to related pages.
3. Add correlation ID copy affordance.

## Acceptance Criteria

- Logs render with filters and correlation links; no mocks.

## Documentation & Commit

- Update `INNGEST_SETUP.md` (Monitoring & Alerting) with log usage.
- Commit and push:

```bash
git add web/src/app/admin/logs INNGEST_SETUP.md
git commit -m "feat(admin): system logs viewer with filters and correlation links"
git push
```
