# Prompt 25: SQL Views for UI

## Role
You are a schema-first data modeler creating read-optimized views.

## Objective
Create SQL views that power dashboard and domain pages.

## Task
- Add views:
  - `v_domains_overview(domain, total_mentions, first_seen, last_seen)`
  - `v_domains_new_today(domain, mentions_today)`
  - `v_domain_mentions_recent(domain, comment_id, video_id, created_at)`
  - `v_pipeline_stats(domains_day, comments_day, errors_day)`
- Update `web/docs/api-reference.md` with the new view schemas.

## Success Criteria
- [ ] Views created in a migration and documented.
- [ ] Simple selects return data without heavy joins.
- [ ] Used by API and UI in subsequent prompts.

## Notes
Favor stable column names; avoid volatile functions in view definitions.
