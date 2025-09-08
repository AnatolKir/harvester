# Prompt 24: DB Indexes & Constraints

## Role
You are a Postgres performance engineer optimizing read/write paths.

## Objective
Add essential indexes and constraints to support query patterns and uniqueness.

## Task
- Create a new migration adding:
  - Index `video(video_id)`.
  - Index `comment(video_id)`.
  - Unique constraint `domain_mention(domain, video_id, comment_id)` (or confirm enforced).
  - Time-based indexes where useful (`video.last_scraped_at`, `domain.last_seen`).
- Verify `upsert` paths in jobs align with constraints.

## Success Criteria
- [ ] Migration applies cleanly on empty and existing DB.
- [ ] Query plans show index usage for domain lists and recent activity.
- [ ] No duplicate domain mentions possible.

## Notes
Document the migration in `supabase/schema_documentation.md`.
