# Prompt 55: Runbook Updates and Operator Guide v2

## Role

You are a Senior Technical Writer/Engineer improving ops documentation.

## Goal

Refresh runbooks and operator guide to include new Sprint 5 features (matviews, breaker, backfill controls, alerts UI).

## Deliverables

- `web/docs/operator-runbook.md` updates
- `web/README.md` Operator Guide updates
- `INNGEST_SETUP.md` additions for matview refresh and breaker

## Requirements

- Clear procedures: detection → diagnosis → mitigation → verification
- Copy-paste commands and links to relevant UIs

## Steps

1. Update runbooks with new thresholds and breaker states.
2. Document matview refresh job and how to disable/enable.
3. Add ‘How to Backfill’ and ‘CSV Export’ operational notes.

## Acceptance Criteria

- On-call can resolve common incidents using docs without code changes

## Documentation & Commit

```bash
git add web/docs/operator-runbook.md web/README.md INNGEST_SETUP.md
git commit -m "docs(runbook): Sprint 5 features and procedures"
git push
```
