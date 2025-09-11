### Sprint 2: MCP Pivot and Schema Reconcile

### Sprint 9 — High‑Yield Domain Harvesting
Goals
- Increase candidate domains by broadening TikTok discovery and adding a lightweight enrichment step that extracts/unwraps links.

Deliverables
- Discovery uses `content_type="all"` with `limit=50` across multiple keywords.
- New MCP tool `tiktok.enrich.links` returns `raw_url`, `final_url`, `raw_host`, `final_host`.
- Inngest pipeline wires discovery → enrichment → storage (`outbound_links` with unique `(video_id, raw_url)`).
- Basic metrics and a daily trending query.

Dependencies
- Railway MCP Gateway healthy with `BRIGHTDATA_API_KEY` and `WEB_UNLOCKER_ZONE`.
- Vercel `MCP_BASE_URL` updated to current Railway URL.

Links
- See `prompts/sprint9/README.md` and related sprint docs.

- Replace Playwright proxy workflow with MCP calls executed in Inngest jobs (Node).
- Reconcile database schema, types, and API to canonical names: `video.video_id`, `domain.domain`, and `domain_mention(domain, video_id, comment_id, created_at)`.
- Implement MCP client (`web/src/lib/mcp/*`), and update Inngest jobs (`inngest/jobs/*`).
- Add observability endpoints (rate-limit metrics) and apply consistent security wrappers to internal routes.
- Mark Playwright worker as legacy (`worker/README_LEGACY.md`).

# TikTok Domain Harvester – Project Plan

## Overview

A solo-engineered MVP that scrapes TikTok **U.S. promoted videos**, harvests comment sections, extracts domains, and surfaces them in a dashboard.  
Scope is comment-first, no enrichment, with Supabase + Vercel + Railway/Fly + Inngest + Upstash Redis.

---

## Timeline (Solo Engineer, AI-Assisted)

### Week 1 – Foundations

- [ ] Repo setup (`/web`, `/worker`).
- [ ] Supabase project: apply schema + RLS policies.
- [ ] Auth (Supabase Auth – email login).
- [ ] REST API routes: `/api/domains`, `/api/videos/[id]/mentions`.
- [ ] Seed fake data & smoke test API/UI.
- [ ] Deploy to Vercel + CI.

### Week 2 – Worker & Pipeline

- [ ] Scaffold Python worker (Railway/Fly).
- [ ] Supabase insert helpers + token bucket (Upstash Redis).
- [ ] Implement domain extractor/normalizer + unit tests.
- [ ] End-to-end pipeline: discovery stub → worker → Supabase → API → UI.

### Week 3 – Discovery & Comment Fetch

- [ ] Integrate TikTok Commercial Content Library (ad discovery).
- [ ] Store discovered video IDs in Supabase `video` table.
- [ ] Implement comment fetcher (cap 1–2 pages/video).
- [ ] Validate pipeline on real promoted videos.

### Week 4 – UI, QA & Launch

- [ ] Build Domain Detail page (mentions list, video links).
- [ ] Add filters: date range, min mentions, TLD.
- [ ] Manual QA (validate ~50 domains, adjust extractor).
- [ ] Metrics dashboard (domains/day, mentions/day).
- [ ] Kill switch & error alerts (Slack/email).
- [ ] Final deploy + README + .env.example.

---

## Deliverables

- **Supabase schema & migrations** (Postgres + RLS).
- **Python worker** for discovery, comment fetch, domain extraction.
- **Next.js dashboard** with domains table, detail pages, filters.
- **Background jobs** via Inngest cron + Redis token bucket.
- **Monitoring & kill switch** for safe ops.

---

## Resources & Costs (MVP)

- Infra + proxies: **$200–$600/mo**.
- DB: Supabase ($25–$79 Pro tier).
- Vercel: $0–$40.
- Worker hosting (Railway/Fly): $20–$60.
- Redis (Upstash): $0–$50.
- Inngest/Trigger.dev: $0–$50.

---

## Success Criteria (MVP)

- ≥200–500 unique domains/week extracted.
- Median delay from first comment → surfaced <15 min.
- Precision ≥70% on manual validation set.
- MVP live in **3–4 weeks** (solo).

---

## Next Steps (Post-MVP)

- DNS/WHOIS/HTTP enrichment.
- Expand beyond promoted ads (organic influencer tracking).
- Alerts (Slack/email), exports (CSV).
- Scoring & trending analysis.
- Multi-region, multi-language support.
