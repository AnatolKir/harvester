# Prompt 33: Videos List Page (SSR)

## Role

You are a Senior Next.js + TypeScript Engineer specializing in data-heavy SSR tables.

## Goal

Implement `app/videos/page.tsx` to list videos with domain counts, comment counts, scrape status, and last scrape time. Use SSR and Supabase views.

## Deliverables

- `web/src/app/videos/page.tsx` (SSR)
- `web/src/app/videos/loading.tsx`
- `web/src/app/videos/error.tsx`

## Requirements

- Query canonical view (e.g., `v_videos_with_domains`) or equivalent joins.
- Columns: TikTok ID, URL, domain_count, comment_count_with_domains, last_scraped_at, scrape_status.
- Search and sort server-side (query params), paginate with cursor.
- Use shadcn/ui table components; responsive.

## Steps

1. Build SSR route; parse query params for search/status/cursor.
2. Fetch paginated data from Supabase and compute `nextCursor`.
3. Render table with server-driven pagination links.
4. Add loading skeleton and error boundary.

## Acceptance Criteria

- `/videos` renders live data with pagination and search.
- No client state management beyond UX niceties.

## Documentation & Commit

- Update `web/README.md` (Key Pages) and add brief usage to `docs/api-reference.md`.
- Commit and push:

```bash
git add web/src/app/videos web/README.md web/docs/api-reference.md
git commit -m "feat(web): add SSR Videos list with pagination and sorting"
git push
```
