# Sprint 6: MCP Gateway Implementation (FINAL)

## What We're Building

After thorough analysis, we only need to build ONE thing: an MCP Gateway server that translates our custom tool calls to BrightData's API.

Everything else (monitoring, rate limiting, circuit breakers, logging, testing, deployment) is already implemented and working.

## The 7 Essential Prompts

### prompt_01_gateway_structure.md

Create the `/mcp-gateway` directory structure with package.json and basic setup.

### prompt_02_express_server.md

Build the Express server with:

- `/mcp` endpoint for tool calls
- `/health` endpoint for monitoring
- Request validation and error handling

### prompt_03_tiktok_search_tool.md

Implement `tiktok.ccl.search` that:

- Uses BrightData's search_engine or scrape_as_markdown
- Returns video metadata in expected format

### prompt_04_comments_page_tool.md

Implement `tiktok.comments.page` that:

- Scrapes TikTok comment pages
- Handles pagination and sessions

### prompt_05_dockerfile.md

Create minimal Docker configuration for Railway deployment.

### prompt_06_railway_deployment.md

Deploy the gateway to Railway and configure environment variables.

### prompt_07_integration_test.md

Test the complete pipeline end-to-end with real data.

## What We're NOT Building

We removed 24 prompts because these are already implemented:

- ✅ Rate limiting (Redis token buckets)
- ✅ Circuit breakers (MCP circuit breaker)
- ✅ Health checks (system health job)
- ✅ Monitoring & alerts (Slack, admin dashboard)
- ✅ Structured logging (database + console)
- ✅ Testing infrastructure (Jest + Playwright)
- ✅ Environment management (validation + staging/prod)
- ✅ API documentation (exists in /web/docs)
- ✅ Error handling (comprehensive)
- ✅ Admin controls (kill switch, job management)

## Execution Plan

**Sequential execution required** (each depends on previous):

1. prompt_01_gateway_structure.md (5 min)
2. prompt_02_express_server.md (15 min)
3. prompt_03_tiktok_search_tool.md (20 min)
4. prompt_04_comments_page_tool.md (20 min)
5. prompt_05_dockerfile.md (5 min)
6. prompt_06_railway_deployment.md (15 min)
7. prompt_07_integration_test.md (20 min)

**Total time: ~100 minutes (under 2 hours)**

## Success Criteria

✅ The existing discovery job finds videos  
✅ The existing harvesting job extracts comments  
✅ Domains appear in the database  
✅ No changes needed to existing code  
✅ Gateway deploys to Railway successfully

## Quick Start

```bash
# Execute prompts in order
prompt_01_gateway_structure.md
prompt_02_express_server.md
prompt_03_tiktok_search_tool.md
prompt_04_comments_page_tool.md
prompt_05_dockerfile.md
prompt_06_railway_deployment.md
prompt_07_integration_test.md
```

## Environment Variables for Gateway

```bash
# Local development
PORT=3333
BRIGHTDATA_API_KEY=<your-api-key>
NODE_ENV=development

# Production (Railway)
PORT=3333
BRIGHTDATA_API_KEY=<your-api-key>
NODE_ENV=production
```

## Update in Vercel

Once deployed, update in Vercel:

```bash
MCP_BASE_URL=https://mcp-gateway-production.up.railway.app
```

This focused approach delivers exactly what's missing without touching any working infrastructure.
