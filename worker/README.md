# TikTok Domain Harvester Worker

Python worker for discovering TikTok promoted videos and harvesting domains from comments.

## Components

- **config.py** - Configuration management with environment variables
- **database.py** - Supabase client for data persistence  
- **rate_limiter.py** - Token bucket rate limiting with Upstash Redis
- **browser.py** - Playwright browser management with stealth mode
- **health.py** - Health check HTTP server for monitoring
- **logger.py** - Structured logging configuration
- **main.py** - Main worker entry point and orchestration

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
playwright install chromium
```

2. Configure environment:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Run the worker:
```bash
python main.py
```

## Docker

Build and run with Docker:
```bash
docker build -t tiktok-worker .
docker run --env-file .env -p 8080:8080 tiktok-worker
```

## Health Checks

The worker exposes health endpoints on port 8080:

- `/health` - Comprehensive health check
- `/ready` - Readiness probe  
- `/live` - Liveness probe
- `/metrics` - Worker metrics

## Configuration

See `.env.example` for all available configuration options.

Required variables:
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_KEY` - Service role key for database access

## Architecture

The worker uses:
- Playwright for browser automation with stealth mode
- Token bucket rate limiting (Redis or local fallback)
- Structured logging with contextual information
- Graceful shutdown on SIGINT/SIGTERM
- Health checks for monitoring