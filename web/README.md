# TikTok Domain Harvester - Web Dashboard

A modern Next.js 14+ dashboard application for tracking and analyzing domains discovered from TikTok comments and promotional content.

## Features

- **Modern Stack**: Next.js 14+ with App Router, TypeScript, and Tailwind CSS
- **Responsive Design**: Mobile-first design with responsive tables and layouts
- **Data Visualization**: Interactive charts and statistics cards
- **Sortable Tables**: Advanced data tables with sorting and filtering
- **Dashboard Interface**: Real-time metrics and domain discovery tracking
- **Component Library**: Built with shadcn/ui and Radix UI components

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS with custom design system
- **Components**: shadcn/ui + Radix UI primitives
- **Icons**: Lucide React
- **Tables**: TanStack Table for advanced data handling
- **Database**: Supabase integration ready
- **Deployment**: Optimized for Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Install dependencies:

   ```bash
   npm install
   ```

2. Set up environment variables:

   ```bash
   cp .env.example .env.local
   # Edit .env.local with your actual values
   ```

3. Run the development server:

   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run format` - Format code with Prettier
- `npm run type-check` - Run TypeScript type checking

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── domains/           # Domain listing page
│   ├── globals.css        # Global styles and CSS variables
│   ├── layout.tsx         # Root layout component
│   └── page.tsx          # Dashboard homepage
├── components/            # Reusable React components
│   ├── layout/           # Layout components (Header, Sidebar)
│   └── ui/               # UI components (Button, Card, Table, etc.)
├── lib/                  # Utility libraries
│   ├── supabase.ts       # Supabase client configuration
│   └── utils.ts          # Common utility functions
└── types/                # TypeScript type definitions
    └── index.ts          # Domain and API types
```

## Environment Variables

Required environment variables (see `.env.example`):

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Redis (Upstash) - for rate limiting
UPSTASH_REDIS_REST_URL=your_upstash_redis_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token
```

## Deployment

This application is optimized for Vercel deployment:

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on pushes to main branch

## Design System

The application uses a custom design system with:

- **Color Palette**: Light/dark mode support with CSS custom properties
- **Typography**: Geist font family (sans & mono)
- **Spacing**: Consistent spacing scale using Tailwind
- **Components**: Accessible components built on Radix UI primitives
- **Responsive**: Mobile-first responsive design

## Key Pages

- **Dashboard (/)**: Overview with key metrics and recent activity
- **Domains (/domains)**: Comprehensive domain listing with search and filters
- **Domain Detail (/domains/[id])**: Mentions, related videos, and activity for a specific domain
- **Videos (/videos)**: Server-rendered list with search, sorting, and cursor pagination
- **Admin Kill Switch (/admin/kill-switch)**: Toggle global processing on/off with audit logging

## Development Guidelines

- Use Server Components by default, Client Components when needed
- Follow the existing component structure in `/components/ui`
- Implement proper TypeScript types in `/types`
- Use the `cn()` utility for conditional className merging
- Format code with Prettier before committing
- Ensure all components are accessible (ARIA labels, keyboard navigation)

## Contributing

1. Follow the existing code style and patterns
2. Add TypeScript types for new features
3. Test responsive design on different screen sizes
4. Run linting and type checking before committing
5. Update this README for significant changes

## Operator Guide

Admin-only operational features are available in the dashboard. RBAC is enforced via `ADMIN_EMAILS` and allowed origins via `ADMIN_ALLOWED_ORIGINS`.

### Admin UI

- Kill Switch: `/admin/kill-switch` — Activate/Deactivate global processing with mandatory reason. Actions are logged to `system_logs`.
- Jobs & Health: `/admin/jobs` — Success rate, last successful run, DLQ size, in-progress jobs; charts and recent executions.
- Dead Letter Queue: `/admin/dead-letter-queue` — Inspect failed jobs; Retry/Delete with confirmation and audit logging.
- System Logs: `/admin/logs` — Filter by level, job type, timeframe, correlation ID, and event type.
- Alerts: `/admin/alerts` — Toggle alerts and tune thresholds (success rate %, max discovery/harvest gaps, DLQ size).
- Exports: `/admin/exports` — Download CSV exports for Domains and Domain Mentions.

### Alerts & Thresholds

- Manage in `/admin/alerts`. Defaults can be tuned via UI and stored in `system_config`:
  - Alerts Enabled
  - Success rate minimum (%)
  - Discovery gap (minutes)
  - Harvest gap (minutes)
  - DLQ threshold (items)

Indicative triggers:

- Kill switch is active
- No successful discovery in 30+ minutes (default)
- No successful harvesting in 60+ minutes (default)
- Job success rate < 70% (default)
- DLQ size ≥ 10 (default)

### Backfill (Discovery)

Trigger a historical backfill via Admin API:

```bash
curl -s -X POST "https://yourdomain.com/api/admin/jobs" \
  -H "Content-Type: application/json" \
  -d '{"action":"trigger_backfill","days":7,"limit":100}' | jq
```

Notes:

- Respects global token bucket (`DISCOVERY_RPM`).
- Idempotent upserts on `video(video_id)`; resumes from checkpoint on restart.

### Circuit Breaker (MCP)

- Status surfaces on `/admin/jobs` response as `mcpCircuitBreaker`.
- Env tuning:
  - `MCP_CB_FAILURE_THRESHOLD` (default 5)
  - `MCP_CB_COOLDOWN_MS` (default 60000)
- States: `closed` → `open` (after failures) → `half-open` (probe) → `closed` on success.

### Materialized Views (Performance)

- Toggle: `MATVIEWS_ENABLED=true|false` (default false). When false, API uses normal SQL views.
- Refresh job: Inngest `materialized-views-refresh` (cron ~5 min) calls `refresh_matviews()`.

### Runbooks

See incident procedures in `web/docs/incidents.md` and operator details in `web/docs/operator-runbook.md`.
