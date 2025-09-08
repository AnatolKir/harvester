# Prompt 44: Docs and Runbooks Finalization

## Role

You are a Senior Technical Writer/Engineer producing operational documentation.

## Goal

Finalize runbooks for incidents (rate limit saturation, MCP failure, DLQ growth), refresh environment and deployment docs, and add an Operator Guide to `web/README.md`.

## Deliverables

- Runbooks in `web/docs/` (incidents.md)
- Updates to `web/docs/ENVIRONMENT.md`, `DEPLOYMENT.md`, `INNGEST_SETUP.md`
- Operator Guide section in `web/README.md`

## Requirements

- Clear step-by-step procedures with commands and links
- Thresholds aligned with alerting; escalation path noted
- Keep concise and actionable

## Steps

1. Author incident runbooks with detection → diagnosis → mitigation → verification.
2. Update environment and deployment steps for new vars and workflows.
3. Add Operator Guide (admin UI overview, alerts, backfill, DLQ) to README.

## Acceptance Criteria

- Docs enable on-call to resolve common incidents without code changes.

## Documentation & Commit

- Commit and push:

```bash
git add web/docs INNGEST_SETUP.md DEPLOYMENT.md web/README.md
git commit -m "docs: finalize runbooks, env/deploy updates, and operator guide"
git push
```
