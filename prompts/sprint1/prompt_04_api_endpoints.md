# API Endpoints Creation

## Objective

Create basic REST API endpoints using Next.js Route Handlers for the TikTok Domain Harvester.

## Context

- Sprint: 1
- Dependencies: prompt_01_database_schema.md, prompt_02_auth_configuration.md
- Related files: /web/app/api/, CLAUDE.md

## Task

Implement core API endpoints:

- GET /api/domains - List domains with pagination
- GET /api/domains/[id] - Get single domain details
- GET /api/videos - List videos with domains
- GET /api/stats - Dashboard statistics
- POST /api/worker/webhook - Inngest webhook endpoint

All endpoints must use Supabase for data access and respect authentication.

## Subagent to Use

Invoke the **Task** subagent with type "general-purpose" to:

- Create route handlers in /web/app/api/
- Implement proper request/response handling
- Add input validation using zod
- Include error handling and status codes
- Set up CORS headers for worker communication
- Add TypeScript types for all responses

## Success Criteria

- [ ] All endpoints returning correct data
- [ ] Proper HTTP status codes used
- [ ] Authentication checked on protected routes
- [ ] Input validation working
- [ ] Error responses follow consistent format
- [ ] TypeScript types defined for all payloads
- [ ] No SQL injection vulnerabilities
- [ ] Response times under 200ms for basic queries

## Notes

Use Next.js 14+ Route Handlers (not API Routes). Implement pagination using cursor-based approach for scalability. Include rate limiting headers in responses. Follow RESTful conventions.
