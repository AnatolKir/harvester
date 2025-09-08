# Prompt 39: CSV Export Endpoints

## Role

You are a Senior API Engineer implementing streaming CSV exports.

## Goal

Add authenticated CSV exports:

- `GET /api/domains/export?dateFilter=...`
- `GET /api/domains/[id]/mentions/export?since=...`

## Deliverables

- `web/src/app/api/domains/export/route.ts`
- `web/src/app/api/domains/[id]/mentions/export/route.ts`

## Requirements

- Stream CSV with proper headers; include rate-limit headers
- Reuse canonical views for efficient queries
- Input validation (zod); standardized error shape

## Steps

1. Implement query parsing and validation.
2. Query Supabase with server client; stream rows to CSV.
3. Add tests/smoke and examples in docs.

## Acceptance Criteria

- CSVs open in spreadsheet tools; handle large result sets without timeouts.

## Documentation & Commit

- Update `web/docs/api-reference.md` with examples.
- Commit and push:

```bash
git add web/src/app/api/domains web/docs/api-reference.md
git commit -m "feat(api): CSV export endpoints for domains and mentions"
git push
```
