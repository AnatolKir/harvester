# TikTok Domain Harvester

### MCP Gateway
- Current URL: set `MCP_BASE_URL` in Vercel to your Railway host, e.g.
  - `https://mcp-gateway-production-66e2.up.railway.app`
- Smoke tests:
```bash
curl -sS $MCP_BASE_URL/health
curl -sS $MCP_BASE_URL/mcp/tools
curl -sS -X POST $MCP_BASE_URL/mcp \
  -H 'Content-Type: application/json' \
  -d '{"tool":"tiktok.ccl.search","params":{"keywords":"ad","limit":5,"country":"US","content_type":"all"}}'
```

See `prompts/sprint9/` for the Sprint 9 plan to maximize harvested domains.

## Overview

A comment-first crawler for TikTok **U.S. promoted videos**.  
It scrapes comments, extracts domains, and surfaces them in a simple dashboard.

**MVP scope**:

- U.S. promoted ads only
- 1–2 comment pages per video
- No DNS/WHOIS/HTTP enrichment
- Focus on speed-to-market using Supabase + Vercel + Railway/Fly + Inngest + Upstash Redis

---

## Stack

- **Frontend/UI**: Next.js (Vercel), Tailwind, shadcn/ui
- **Backend/API**: Next.js Route Handlers (REST, not tRPC)
- **Database**: Supabase (Postgres + RLS)
- **Workers**: Python + Playwright (Railway/Fly)
- **Scheduling/Jobs**: Inngest (cron, retries)
- **Queue/Rate limiting**: Upstash Redis (token bucket)
- **Auth**: Supabase Auth (email login, service role for workers)

---

## Repo Layout

```
/web       -> Next.js app (UI + REST API)
/worker    -> Python worker for discovery + comment harvest
/inngest   -> Job definitions (cron + triggers)
```

---

## Setup

### 1. Clone & Install

```bash
git clone https://github.com/your-org/tiktok-domain-harvester.git
cd tiktok-domain-harvester
```

**Web** (Next.js):

```bash
cd web
npm install
npm run dev
```

**Worker** (Python):

```bash
cd worker
pip install -r requirements.txt
python main.py
```

### 2. Environment Variables

Create `.env` in project root with:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Redis (Upstash)
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...

# Worker
SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_ROLE_KEY}

# Inngest
WORKER_WEBHOOK_URL=https://your-worker-url/ingest
```

### 3. Database

- Push schema to Supabase:

```bash
psql $SUPABASE_URL < supabase/schema.sql
```

### 4. Deploy

- **Web**: push to GitHub → Vercel auto-deploy
- **Worker**: deploy to Railway/Fly
- **Inngest**: deploy jobs with `inngest dev` or GitHub Actions

#### Worker (Railway)

- **Service URL**: use your Railway service domain (or a custom CNAME like `worker.data.highlyeducated.com`).
- **Health Endpoints** (port 8080):
  - `/live` (liveness)
  - `/ready` (readiness)
  - `/health` (comprehensive)
- **Redeploy**: Railway → your service → Deployments → Redeploy (or enable auto-deploy on pushes to `main`).
- **Required env (Railway)**:
  - `SUPABASE_URL` (usually same as `NEXT_PUBLIC_SUPABASE_URL`)
  - `SUPABASE_SERVICE_KEY` (service role key)
  - `WORKER_ENV=production`
  - Optional: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` for global rate limiting
  - Optional: `LOG_LEVEL`, `MAX_CONCURRENT_BROWSERS`, `PROXY_*`
- **Optional web → worker**: if the UI should trigger worker actions, set `WORKER_WEBHOOK_URL` in Vercel to your worker endpoint and secure it with a bearer token. (We can add this route when needed.)

---

## Usage

- Visit `/domains` to see “New Today” domains.
- Click a domain for detail view: mentions, video links.
- Filter by TLD, min mentions, date.

---

## Roadmap (Post-MVP)

- Enrichment (DNS/WHOIS/HTTP)
- Alerts (Slack/email)
- CSV exports
- Trending & scoring
- Multi-region, multi-language support

---

## License

Private – internal use only for now.
