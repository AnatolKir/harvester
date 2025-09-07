# Prompt 15: Comments Fetch

Goal
- Implement comments pagination via MCP with sticky sessions.

Steps
1) Wrapper `web/src/lib/mcp/comments.ts`
   - Loop `page=1..maxPages`; call `tiktok.comments.page` with `{ videoId, page }` and `{ sticky: true, sessionId }`.
   - Update `sessionId` if response provides it.
   - Normalize to: `{ comment_id, text, user_id, created_at|null, lang|null }`.
   - Stop when `hasMore` is false.
2) Job `inngest/jobs/harvesting.ts`
   - Upsert `comment` rows by `id=comment_id`, set `video_id`, `content`, `author_username`, `posted_at`.
   - Return counts; trigger domain extraction events for each new comment.

Acceptance
- Inserted comments visible in `comment` table with correct `video_id`.
- Pagination halts when `hasMore=false` or `page=maxPages`.
- Sticky session maintained across pages when provided.
