# Prompt 46: DNS/WHOIS Enrichment Job (v1.5)

## Role

You are a Senior Backend Engineer adding low-cost enrichment signals with strict rate limits.

## Goal

Implement a minimal DNS/WHOIS enricher that augments `domain.metadata` with A/AAAA records, CNAME, MX presence, and creation/expiry dates (from a lightweight WHOIS API), then surface badges on Domain Detail.

## Deliverables

- `inngest/jobs/enrichment-dnswhois.ts`
- Domain Detail UI badges in `web/src/app/domains/[id]/page.tsx`
- Env validation for `WHOIS_API_URL`, `WHOIS_API_KEY` (optional feature flag)

## Requirements

- Respect token bucket RPM (e.g., 30/min) using shared rate-limit utilities
- Timeout ≤5s per call; retries with jitter for transient errors
- Store under `domain.metadata.dns` and `domain.metadata.whois`
- Avoid heavy payloads; persist only essential fields

## Steps

1. Add job selecting recent domains missing `metadata.dns` or `metadata.whois`.
2. Resolve DNS (A/AAAA, CNAME, MX-boolean) with timeout.
3. Query WHOIS API (if configured) and parse `created_at`, `expires_at`, `registrar`.
4. Upsert JSON blobs and set `verified_at` if DNS is resolvable.
5. Render compact badges on Domain Detail (e.g., DNS ok, created year, registrar).

## Acceptance Criteria

- Job runs safely within limits; persists minimal, typed metadata
- Domain Detail shows badges when data available; no client components introduced
- Feature disabled gracefully when WHOIS API not configured

## Documentation & Commit

- Update `supabase/schema_documentation.md` (metadata fields) and `INNGEST_SETUP.md` (schedule and env)
- Commit and push:

```bash
git add inngest/jobs/enrichment-dnswhois.ts web/src/app/domains/[id] web/lib/env.ts supabase/schema_documentation.md INNGEST_SETUP.md
git commit -m "feat(enrichment): DNS/WHOIS job and badges on domain detail"
git push
```
