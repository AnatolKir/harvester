# Implement Rate Limiting

## Objective

Add comprehensive rate limiting to the MCP Gateway to prevent overwhelming BrightData's service and ensure fair usage.

## Context

- Sprint: 6
- Dependencies: prompt_08_session_management.md
- Related files: `/mcp-gateway/src/rate-limiter.ts`

## Task

Implement a multi-layered rate limiting system that protects both the gateway and BrightData's service from overuse while maintaining optimal performance.

### Requirements

1. Create `src/rate-limiter.ts` with rate limiting logic
2. Multi-level rate limiting:
   - **Global**: Overall requests per minute to gateway
   - **Per-tool**: Specific limits for different tools
   - **Per-session**: Prevent individual session abuse
   - **BrightData**: Respect upstream service limits
3. Rate limiting algorithms:
   - Token bucket for burst handling
   - Sliding window for fairness
   - Exponential backoff for failures
4. Implementation components:

   ```typescript
   class RateLimiter {
     checkLimit(key: string, limit: Limit): Promise<boolean>;
     getRemainingQuota(key: string): Promise<number>;
     recordUsage(key: string): Promise<void>;
     resetLimits(): Promise<void>;
   }

   interface Limit {
     requests: number;
     window: number; // seconds
     burst?: number;
   }
   ```

5. Rate limit configuration:
   - tiktok.ccl.search: 30 requests/minute
   - tiktok.comments.page: 60 requests/minute
   - Global gateway: 100 requests/minute
   - Per session: 20 requests/minute

### Rate Limiting Features

- Redis-backed for distributed rate limiting
- Graceful degradation when limits exceeded
- Rate limit headers in responses
- Detailed logging for monitoring
- Admin endpoints for limit management

## Agent to Use

Invoke the **@brightdata** agent to:

- Review rate limiting strategies for MCP services
- Suggest appropriate limits for BrightData integration
- Validate rate limiting algorithms and implementation
- Guide on monitoring and alerting for rate limits

## Success Criteria

- [ ] Rate limits prevent service overload
- [ ] Burst traffic handled gracefully
- [ ] Rate limit headers included in responses
- [ ] Exceeded limits return proper 429 status
- [ ] Different tools have appropriate limits
- [ ] Redis integration works for distributed limiting

## Notes

- Use Redis for shared rate limiting state
- Implement circuit breaker integration
- Consider rate limit bypass for health checks
- Plan for dynamic limit adjustment based on usage
