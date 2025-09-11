## Execution Plan (Sprint 9)

Day 0 (today)
- Switch discovery to `content_type="all"`, `limit=50`, add 5–8 broad keywords.
- Verify MCP `/health`, `/mcp/tools`, and `/mcp` search responses.
- Ensure Railway env: `BRIGHTDATA_API_KEY`, `WEB_UNLOCKER_ZONE`, `CORS_ORIGIN`.
- Update Vercel `MCP_BASE_URL` to the new Railway URL and redeploy web.

Day 1
- Implement MCP tool `tiktok.enrich.links`:
  - Input: `{ video_url: string, include_profile?: boolean }`.
  - Output per link: `{ video_id, raw_url, final_url, raw_host, final_host, source: 'video'|'profile' }`.
  - Uses Bright Data request API; follows redirects.
- Inngest wiring: discovery results → enqueue enrichment (idempotency key `video:${video_id}`) → persist `outbound_links` with unique key `(video_id, raw_url)`.

Day 2
- Add counters/metrics and daily trending SQL.
- Tune rate limits; ramp concurrency gradually while monitoring 429/CAPTCHA.

Definition of Ready
- Railway service healthy and reachable; Vercel pointed to correct MCP URL.
- Bright Data credentials present; zone provisioned.

Definition of Done
- Discovery producing URLs for multiple keywords.
- Enrichment storing links with duplicates suppressed on `(video_id, raw_url)`.
- Trending query returns top hosts for last 24h.

