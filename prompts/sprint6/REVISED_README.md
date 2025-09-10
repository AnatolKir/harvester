# Sprint 6: MCP Gateway Implementation (REVISED)

## The Actual Problem

After analyzing the codebase, 95% of the infrastructure is already built and working:

- ✅ Complete monitoring, alerting, and admin dashboard
- ✅ Redis-based rate limiting with token buckets
- ✅ Circuit breakers for MCP calls
- ✅ Health checks and structured logging
- ✅ Testing infrastructure
- ✅ Deployment configuration
- ✅ MCP client code calling custom tools

**The ONLY missing piece**: An HTTP gateway server that translates our custom MCP tools to BrightData's API.

## What Actually Needs to Be Built

A simple Node.js/Express server that:

1. Listens on port 3333 (or configurable)
2. Handles POST `/mcp` requests
3. Translates 2 custom tools to BrightData calls:
   - `tiktok.ccl.search` → Use BrightData's search/scrape
   - `tiktok.comments.page` → Scrape TikTok comment pages
4. Returns responses in the expected format

## Revised Sprint Structure (5 Prompts Only)

### prompt_01_mcp_gateway_server.md

Create the basic Express server with:

- `/mcp` endpoint
- Request validation
- BrightData client setup
- Health check endpoint
- Basic error handling

### prompt_02_tiktok_search_implementation.md

Implement `tiktok.ccl.search` tool:

- Parse discovery parameters (region, windowHours, pageSize)
- Call BrightData's search_engine or scrape_as_markdown
- Format response as `{ items: [{ video_id, url, advertiser, seen_at }] }`
- Handle errors and edge cases

### prompt_03_comments_page_implementation.md

Implement `tiktok.comments.page` tool:

- Parse video_id and pagination parameters
- Scrape TikTok comment pages via BrightData
- Handle session management for sticky sessions
- Format response as `{ items: [comments], hasMore, sessionId }`

### prompt_04_gateway_deployment.md

Deploy the gateway:

- Create minimal Dockerfile
- Deploy to Railway as new service
- Configure environment variables
- Set up health monitoring

### prompt_05_integration_testing.md

Test the complete pipeline:

- Start gateway locally
- Run discovery job
- Verify videos are found
- Run harvesting job
- Verify comments are extracted
- Check domains appear in database

## Why This Approach

1. **No duplication**: We're only building what's missing
2. **Minimal risk**: Small, focused changes
3. **Quick delivery**: 2-3 hours vs 2-3 days
4. **Immediate value**: Unblocks the entire pipeline

## Environment Variables Needed

```bash
# For the MCP Gateway
PORT=3333
BRIGHTDATA_API_KEY=<your-key>
NODE_ENV=production

# Update in Vercel/Railway
MCP_BASE_URL=https://mcp-gateway.yourdomain.com  # or http://localhost:3333 for local
```

## Success Criteria

- [ ] Gateway server responds to health checks
- [ ] Discovery job successfully finds videos
- [ ] Harvesting job successfully extracts comments
- [ ] Domains appear in the database
- [ ] No changes needed to existing code

## Implementation Time

- Prompts 1-3: ~1 hour (core functionality)
- Prompt 4: ~30 minutes (deployment)
- Prompt 5: ~30 minutes (testing)
- **Total: ~2 hours**

This focused approach delivers exactly what's needed without touching the working infrastructure.
