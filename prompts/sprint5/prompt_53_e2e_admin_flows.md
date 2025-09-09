# Prompt 53: E2E Tests for Admin Flows

## Role

You are a Senior QA Engineer adding end-to-end coverage for critical admin flows.

## Goal

Cover kill switch, DLQ retry/delete, backfill trigger, and CSV exports via Playwright (or Cypress).

## Deliverables

- E2E tests under `web/e2e/` with fixtures and CI script

## Requirements

- Auth login helper; mock or seed data for deterministic checks
- Tests run headless in CI; artifacts saved on failure

## Steps

1. Configure Playwright in `web/` with auth helper and baseURL.
2. Write tests for:
   - Toggle kill switch and verify system_config/logs
   - DLQ retry & delete happy paths
   - Trigger backfill and verify status card
   - Download CSV and verify header/row count

## Acceptance Criteria

- All admin flows green locally and in CI

## Documentation & Commit

```bash
git add web/playwright.config.ts web/e2e/* .github/workflows/e2e.yml
git commit -m "test(e2e): admin flows coverage"
git push
```
