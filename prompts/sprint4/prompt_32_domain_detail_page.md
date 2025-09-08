# Prompt 32: Domain Detail Page (SSR)

## Role

You are a Senior Next.js + TypeScript Engineer with deep experience in App Router, Server Components, and Supabase.

## Goal

Implement the `app/domains/[id]/page.tsx` Server Component that renders a full domain detail view powered by Supabase SQL views/RPCs. Include `loading.tsx`, `error.tsx`, and `generateMetadata()`.

## Deliverables

- `web/src/app/domains/[id]/page.tsx` (SSR)
- `web/src/app/domains/[id]/loading.tsx`
- `web/src/app/domains/[id]/error.tsx`
- `generateMetadata()` for SEO
- Strict TypeScript types using `Database` types

## Requirements

- Fetch via Server Components using Supabase server client
- Show: core stats, recent mentions (max 20), linked videos/comments, small daily time series (7–30d)
- Use canonical views or RPCs (e.g., `v_comments_with_domains`, `v_videos_with_domains`, `get_stats_time_series` if applicable)
- Handle not found using `notFound()`
- Tailwind for layout, responsive

## Steps

1. Add route files and skeletons; wire Supabase server client.
2. Fetch domain by `id` and related data (mentions, video summaries, time series).
3. Render cards, tables, and charts using existing `components/ui/*` primitives.
4. Add `loading.tsx` (skeleton) and `error.tsx` (boundary with reset action).
5. Implement `generateMetadata()` with domain name in title/description.
6. Add unit smoke test if test setup exists; verify strict types.

## Acceptance Criteria

- Navigating to `/domains/:id` renders live data (no mocks).
- 404 on unknown `id` using `notFound()`.
- Page is SSR, no unnecessary client components.
- Lighthouse basic checks pass; no type or lint errors.

## Documentation & Commit

- Update `web/README.md` (Key Pages) and `web/docs/api-reference.md` (if new queries/views are used).
- Commit and push:

```bash
git add web/src/app/domains/[id] web/README.md web/docs/api-reference.md
git commit -m "feat(web): add SSR Domain Detail page with mentions, videos, timeseries"
git push
```
