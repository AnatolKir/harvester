# Prompt 26: API over SQL Views

## Role
You are an API engineer implementing thin, secure REST endpoints.

## Objective
Expose the new UI views via authenticated, rate-limited Next.js route handlers.

## Task
- Add endpoints:
  - `GET /api/domains` → `v_domains_overview` (paging, sort, search)
  - `GET /api/domains/new-today` → `v_domains_new_today`
  - `GET /api/domains/[domain]/mentions` → `v_domain_mentions_recent`
  - `GET /api/admin/pipeline-stats` → `v_pipeline_stats` (admin only)
- Use `withSecurity(AuthenticatedApiSecurity)` and existing rate limit middleware.

## Success Criteria
- [ ] Strong typing of responses in `web/src/types/api.ts`.
- [ ] RLS enforced; service key never exposed client-side.
- [ ] Unit tests for handlers’ happy-path and auth failures.

## Notes
Keep handlers thin; push heavy work into views.
