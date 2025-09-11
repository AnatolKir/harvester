## Sprint 9 — High‑Yield Domain Harvesting

Goals
- Maximize discovered domains now by searching broadly and extracting links from TikTok pages.
- Keep all variants as found (no normalization), dedupe only by `video_id + raw_url`.
- Add a simple enrichment tool that fetches video and profile pages via Bright Data and extracts/unwraps links.

Key Deliverables
- Discovery uses `content_type="all"` and higher `limit` (50).
- New MCP tool `tiktok.enrich.links` returning `raw_url`, `final_url`, `raw_host`, `final_host`.
- Inngest wiring: discovery → enqueue enrichment → persist `outbound_links`.
- Rate limiting tuned; basic metrics; daily trending query.

Acceptance Criteria
- Hitting `/mcp` with search returns URLs for multiple keywords.
- Enrichment resolves redirects and stores at least `video_id, raw_url, final_url, raw_host, final_host`.
- Duplicate suppression is effective on `video_id + raw_url`.
- Trending query returns top hosts for last 24h.

Files in this sprint
- `execution_plan.md` — day‑by‑day actions and DOR/DoD.
- `prompt_01_discovery_config.md` — broadened search config.
- `prompt_02_enrichment_endpoint.md` — MCP tool spec and response schema.
- `prompt_03_storage_model.md` — minimal tables and indexes.
- `prompt_04_ingestion_jobs.md` — Inngest job flow.
- `prompt_05_rate_limiting.md` — suggested RPM/concurrency.
- `prompt_06_observability.md` — metrics/logs and a trending SQL.
- `prompt_07_rollout_plan.md` — staged launch and validation.

Notes
- MCP base URL must point to the latest Railway deployment.
- Bright Data: ensure `BRIGHTDATA_API_KEY` and `WEB_UNLOCKER_ZONE` are set on Railway.

