# Prompt 54: Security Headers and CSP

## Role

You are a Senior Security Engineer tightening response headers.

## Goal

Add strict security headers (CSP, HSTS, X-Content-Type-Options, Referrer-Policy) to API and app responses.

## Deliverables

- Middleware/util: `web/src/middleware.ts` or `web/src/lib/security/headers.ts`
- Docs: update `DEPLOYMENT.md` with production guidance

## Requirements

- CSP compatible with Next.js and TikTok embeds (if any)
- Non-breaking defaults in development

## Steps

1. Implement reusable header function and apply to route handlers.
2. Configure Next.js middleware for app pages.
3. Document environment-specific overrides.

## Acceptance Criteria

- Headers visible in responses; no console CSP violations in normal flows

## Documentation & Commit

```bash
git add web/src/lib/security/headers.ts web/src/middleware.ts DEPLOYMENT.md
git commit -m "sec(headers): add CSP and security headers"
```
