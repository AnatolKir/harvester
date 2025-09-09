# Prompt 50: Admin Backfill Controls (UI + API)

## Role

You are a Senior Full-Stack Engineer improving operator UX.

## Goal

Add a small control panel to trigger/monitor the discovery backfill job with parameters (days, limit) and show last checkpoint.

## Deliverables

- UI: `web/src/app/admin/jobs/backfill/page.tsx`
- API: extend `/api/admin/jobs` with `trigger_backfill` + status read

## Requirements

- Form inputs for days (1–30) and limit (10–500)
- Show last checkpoint from `system_config.discover_backfill_checkpoint`
- RBAC guard and success/error toasts

## Steps

1. Extend admin API to accept `trigger_backfill`.
2. Build SSR page with a simple form and status cards.
3. Wire to Inngest backfill and display current checkpoint.

## Acceptance Criteria

- Admin can trigger backfill with parameters and see live status

## Documentation & Commit

```bash
git add web/src/app/admin/jobs/backfill page files web/src/app/api/admin/jobs/route.ts
git commit -m "feat(admin): backfill controls (UI + API)"
git push
```
