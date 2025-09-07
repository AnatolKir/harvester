# Prompt 14: Discovery via CCL

Goal
- Implement CCL discovery and connect it to the discovery job.

Steps
1) Wrapper `web/src/lib/mcp/discovery.ts`
   - Call tool `tiktok.ccl.search` with `{ region, windowHours, pageSize }`.
   - Normalize to: `{ video_id, url, advertiser|null, seen_at: ISO }`.
   - Filter empty `video_id`/`url`.
2) Job wiring `inngest/jobs/discovery.ts`
   - Instantiate `MCPClient` from env.
   - Fetch items; upsert into `video` with `onConflict: video_id`.
   - Count `newVideos` based on upsert outcome.
3) Observability
   - Log found count and new videos; include attempt metadata.

Acceptance
- `video` rows created/updated with canonical `video_id`.
- Errors surface in logs with MCP status + body.
- Page size respected (pass-through from event payload).
