# Prompt 51: Alert Thresholds and Toggles (UI)

## Role

You are a Senior Observability Engineer surfacing alert controls to operators.

## Goal

Expose alert thresholds and toggles for Slack notifications (success rate, gaps, DLQ size) in the admin UI.

## Deliverables

- UI: `web/src/app/admin/alerts/page.tsx`
- API: `/api/admin/config` updates for alert keys

## Requirements

- Keys in `system_config`: `alert_success_rate_min`, `alert_discovery_gap_min`, `alert_harvest_gap_min`, `alert_dlq_threshold`, `alerts_enabled`
- SSR form with validation, RBAC, and success/error messages

## Steps

1. Extend admin config API to read/write the above keys.
2. Build SSR form with inputs and save button.
3. Ensure Slack util respects `alerts_enabled`.

## Acceptance Criteria

- Operator can change thresholds; Slack alerts pick up new values without redeploy

## Documentation & Commit

```bash
git add web/src/app/admin/alerts page files web/src/app/api/admin/config/route.ts web/src/lib/alerts/slack.ts
git commit -m "feat(admin): alert thresholds and toggles"
git push
```
