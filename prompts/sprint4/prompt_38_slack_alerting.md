# Prompt 38: Slack Alerting for Health Thresholds

## Role

You are a Senior SRE/Platform Engineer integrating lightweight alerting.

## Goal

Send Slack webhook alerts for health thresholds defined in `INNGEST_SETUP.md` (kill switch, discovery/harvest gaps, success rate <70%, DLQ ≥10).

## Deliverables

- Slack utility in `web/src/lib/alerts/slack.ts`
- Config in `web/src/lib/env.ts` (`SLACK_WEBHOOK_URL`)
- Calls from health check system job or admin API controller

## Requirements

- Message formatting with context and links to `/admin`
- Robust error handling; non-blocking
- Feature-flag via env

## Steps

1. Add env typing/validation for `SLACK_WEBHOOK_URL`.
2. Implement `sendSlackAlert(type, payload)` utility with retry/backoff.
3. Invoke from health check Inngest job and relevant admin actions.

## Acceptance Criteria

- Alerts fire in Slack for simulated threshold breaches.

## Documentation & Commit

- Update `DEPLOYMENT.md` and `web/docs/ENVIRONMENT.md` with Slack config.
- Commit and push:

```bash
git add web/src/lib/alerts web/lib/env.ts DEPLOYMENT.md web/docs/ENVIRONMENT.md
git commit -m "feat(alerts): Slack webhook alerts for health thresholds"
git push
```
