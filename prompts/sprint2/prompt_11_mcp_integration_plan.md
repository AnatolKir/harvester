# Prompt 11: MCP Integration Plan (Sprint 2)

Context
- Replace Playwright+proxy with MCP (Bright Data) calls executed inside Inngest jobs.
- Preserve RLS/auth; only server-side Supabase key performs writes.

Deliverables
- `web/src/lib/mcp/client.ts` with typed `MCPClient` and sticky-session support.
- `web/src/lib/mcp/discovery.ts` and `comments.ts` wrappers.
- Updated Inngest jobs in `inngest/jobs/discovery.ts` and `inngest/jobs/harvesting.ts` to call MCP and write to Supabase.
- Env and docs updated; Makefile env checks include MCP.

Implementation Steps
1) Env
   - Add to `web/lib/env.ts`: `MCP_BASE_URL`, `BRIGHTDATA_MCP_API_KEY` (fallback `API_TOKEN`), `MCP_STICKY_SESSION_MINUTES`, `DISCOVERY_RPM`, `COMMENTS_RPM`.
   - Docs: `web/docs/ENVIRONMENT.md` include defaults and alias; Makefile `validate-env-vars` checks MCP vars.
2) Client
   - Implement `MCPClient.call(tool, params, { sticky, sessionId })`.
   - Throw informative errors: include status + text.
3) Wrappers
   - discovery: call `tiktok.ccl.search` → normalize `{ video_id, url, advertiser, seen_at }`.
   - comments: `tiktok.comments.page` loop with sticky session; normalize `{ comment_id, text, user_id, created_at, lang }`.
4) Jobs
   - discovery: upsert into `video(video_id, url, is_promoted=true)` with `onConflict: video_id`.
   - harvesting: upsert `comment(id=comment_id, video_id, content, author_username, posted_at)`; trigger domain extraction.
5) Backfill/Rate-limit hooks (future): use DISCOVERY_RPM/COMMENTS_RPM for pacing.

Data Contracts
- MCP discovery response: `{ items: Array<{ id|video_id, url, advertiser?, seen_at? }>, ... }`.
- MCP comments response: `{ items: Array<{ id, text, user_id, created_at?, lang? }>, hasMore: boolean, sessionId?: string }`.

Risks & Mitigations
- Provider schema drift → gate normalization through wrappers; add unit tests with sample payloads.
- Session stickiness failures → tolerate missing `sessionId` and continue.

Definition of Done
- End-to-end: Inngest discovery finds ≥1 item and writes to `video` by `video_id`.
- Harvesting writes ≥1 comment for a known `video_id` and triggers extraction events.
- Env validation passes and docs reflect MCP usage.

