# Redis Rate Limiting Implementation

## Objective

Implement global rate limiting using Upstash Redis with token bucket pattern for the TikTok harvester.

## Context

- Sprint: 1
- Dependencies: None (independent infrastructure component)
- Related files: /web/lib/rate-limit/, CLAUDE.md

## Task

Set up rate limiting infrastructure:

- Configure Upstash Redis client
- Implement token bucket algorithm
- Create rate limiting middleware
- Add per-endpoint and per-user limits
- Implement global limits for TikTok API calls
- Add rate limit headers to responses

## Subagent to Use

Invoke the **Task** subagent with type "general-purpose" to:

- Set up Upstash Redis client in /web/lib/rate-limit/
- Implement token bucket pattern for rate limiting
- Create reusable rate limiting utilities
- Add middleware for API routes
- Configure different limits for different operations
- Add monitoring and logging for rate limit hits

## Success Criteria

- [ ] Redis client connecting to Upstash
- [ ] Token bucket algorithm implemented correctly
- [ ] Rate limits enforced on API endpoints
- [ ] Proper 429 responses when limits exceeded
- [ ] Rate limit headers included in responses
- [ ] Different limits for auth vs unauth users
- [ ] Global TikTok scraping limits working
- [ ] No memory leaks in token bucket implementation

## Notes

Use Upstash Redis REST API for edge compatibility. Implement exponential backoff for rate-limited requests. Consider implementing sliding window as fallback. Document rate limits clearly for API consumers.
