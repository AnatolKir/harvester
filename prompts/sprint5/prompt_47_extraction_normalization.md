# Prompt 47: Domain Extraction Normalization & Tests

## Role

You are a Senior Data Engineer improving precision/recall for domain extraction.

## Goal

Strengthen the extraction/normalization pipeline to dedupe near-duplicates, better handle TLDs/subdomains, and add unit tests with a gold set.

## Deliverables

- Extraction utilities in `web/src/lib/extraction/*`
- Updated domain extraction step in `inngest/jobs/harvesting.ts`
- Test suite in `web/src/__tests__/extraction.test.ts`

## Requirements

- Normalize to `example.com` canonical where appropriate; preserve `sub.example.co.uk` when meaningful
- Ignore obvious false positives (emails, emojis, trailing punctuation)
- Provide `normalizeDomain(input): { domainName, tld, subdomain }`

## Steps

1. Create normalization helpers and regex improvements.
2. Add fuzzy dedupe within a single comment and across job batch.
3. Introduce test vectors (50–100 cases) with expected outputs.
4. Wire normalization into `tiktok/domain.extract` path.

## Acceptance Criteria

- Tests pass; extraction precision improves on provided vectors
- Upserts avoid duplicates across `(domain, video_id, comment_id)` reliably

## Documentation & Commit

```bash
git add web/src/lib/extraction inngest/jobs/harvesting.ts web/src/__tests__/extraction.test.ts
git commit -m "feat(extraction): better normalization, dedupe, and tests"
git push
```
