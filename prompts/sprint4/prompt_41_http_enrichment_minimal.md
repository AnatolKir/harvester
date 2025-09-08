# Prompt 41: Minimal HTTP Enrichment Job (+ UI surfacing)

## Role

You are a Senior Backend Engineer adding low-risk enrichment at controlled rate.

## Goal

Implement a lightweight HTTP verifier for discovered domains (HEAD/GET) to capture reachability, status code, and server header; store in `domain.metadata` and `verified_at`. Surface on Domain Detail.

## Deliverables

- Inngest job `inngest/jobs/enrichment-http.ts`
- Domain Detail additions (status/server header/verified_at)

## Requirements

- Low RPM (e.g., 30/min) with token bucket; backoff on failures
- Respect robots/timeout constraints; 5s timeout
- Store small JSON blob under `domain.metadata.http`

## Steps

1. Add job to select recent domains lacking `verified_at` and fetch HEAD/GET.
2. Parse minimal signals; upsert metadata and set `verified_at` on success.
3. Render on Domain Detail page in a compact card.

## Acceptance Criteria

- Job runs safely within limits; UI shows enrichment when available.

## Documentation & Commit

- Update `schema_documentation.md` (metadata usage) and `INNGEST_SETUP.md` (job schedule).
- Commit and push:

```bash
git add inngest/jobs/enrichment-http.ts web/src/app/domains/[id] supabase/schema_documentation.md INNGEST_SETUP.md
git commit -m "feat(enrichment): minimal HTTP verifier job and UI surfacing"
git push
```
