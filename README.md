# TikTok Domain Harvester

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
