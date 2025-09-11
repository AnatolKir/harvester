## Prompt 04 — Ingestion Jobs (Inngest)

Flow
1) Discovery job
   - For each keyword, call `tiktok.ccl.search` with `{ content_type: 'all', limit: 50 }`.
   - Extract `video_id` from URLs.
   - UPSERT `videos(video_id, url)`; enqueue enrichment with idempotency key `video:${video_id}`.

2) Enrichment job
   - Call MCP `tiktok.enrich.links` for each `video_url` (and profile).
   - Insert each link into `outbound_links` with unique `(video_id, raw_url)`.
   - Capture metrics: `links_found`, `links_saved`, `429s`.

Retry/Backoff
- Exponential backoff on 429; jittered delays; circuit‑break if sustained error rate >3%.

