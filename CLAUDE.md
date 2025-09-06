# TikTok Domain Harvester - Project Context

## Project Overview

A comment-first web crawler for TikTok U.S. promoted videos that extracts domains from comments and surfaces them in a dashboard. The MVP focuses on speed-to-market with no DNS/WHOIS/HTTP enrichment.

## Technical Stack

- **Frontend**: Next.js on Vercel with Tailwind CSS and shadcn/ui
- **Backend**: Next.js Route Handlers (REST API)
- **Database**: Supabase (PostgreSQL with Row-Level Security)
- **Workers**: Python with Playwright on Railway/Fly
- **Job Scheduling**: Inngest for cron jobs and retries
- **Rate Limiting**: Upstash Redis with token bucket pattern
- **Auth**: Supabase Auth (email-only for MVP)

## Repository Structure

```
/web       -> Next.js application (UI + REST API)
/worker    -> Python worker for discovery + comment harvesting
/inngest   -> Job definitions (cron + triggers)
/supabase  -> Database schema and migrations
/scripts   -> Utility scripts (e.g., seed_db.py)
```

## Key Commands

```bash
make install       # Install all dependencies
make dev          # Run Next.js dev server
make worker       # Run Python worker locally
make db-push      # Push schema to Supabase
make db-seed      # Seed fake data
make lint         # Run linters
make test         # Run tests
make deploy-web   # Deploy to Vercel
make deploy-worker # Deploy worker (Railway/Fly)
make clean        # Remove caches and build artifacts
```

## Database Schema

Core tables:

- `video` - TikTok promoted video metadata
- `comment` - Comments from videos
- `domain` - Unique domains discovered
- `domain_mention` - Links domains to comments/videos

SQL views drive the UI (e.g., `v_domains_new_today`)

## Development Workflow

1. Discovery runs every 10 minutes via Inngest cron
2. Worker fetches comments (1-2 pages per video max)
3. Domains extracted and normalized
4. Data stored in Supabase
5. UI displays via SQL views

## MVP Constraints

- U.S. promoted ads only
- 1-2 comment pages per video
- No enrichment (DNS/WHOIS/HTTP)
- Email-only authentication
- No multi-region support

## Success Metrics

- 200-500 unique domains/week
- <15 min median delay from comment to surfaced
- ≥70% precision on manual validation
- 3-4 week delivery timeline

## Architectural Principles

- MVP-first approach
- Schema-first development
- Simplicity over abstraction
- Composable, replaceable components
- Global rate limiting
- Kill switches for safety

## Future Roadmap (Post-MVP)

- DNS/WHOIS/HTTP enrichment
- Slack/email alerts
- CSV exports
- Trending analysis & scoring
- Multi-region and multi-language support
- Organic influencer tracking

## Environment Variables Required

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY

# Redis (Upstash)
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN

# Worker
SUPABASE_URL
SUPABASE_SERVICE_KEY

# Inngest
WORKER_WEBHOOK_URL
```

## Estimated Costs

- Infrastructure + proxies: $200-600/month
- Supabase: $25-79
- Vercel: $0-40
- Worker hosting: $20-60
- Redis: $0-50
- Inngest: $0-50
