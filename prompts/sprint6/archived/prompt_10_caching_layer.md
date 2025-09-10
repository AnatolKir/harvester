# Add Caching Layer

## Objective

Implement intelligent caching for MCP Gateway responses to reduce BrightData API calls and improve performance.

## Context

- Sprint: 6
- Dependencies: prompt_09_rate_limiting.md
- Related files: `/mcp-gateway/src/cache.ts`

## Task

Create a multi-tier caching system that optimizes performance while ensuring data freshness for the domain harvesting pipeline.

### Requirements

1. Create `src/cache.ts` with caching logic
2. Multi-tier caching strategy:
   - **Memory cache**: Frequently accessed data (1-5 minutes)
   - **Redis cache**: Shared cache across instances (5-30 minutes)
   - **Response cache**: Tool-specific caching rules
3. Caching policies by tool:
   - `tiktok.ccl.search`: Cache 10 minutes (trending changes slowly)
   - `tiktok.comments.page`: Cache 5 minutes (comments update frequently)
   - Health checks: Cache 30 seconds
4. Cache implementation:

   ```typescript
   class CacheManager {
     get<T>(key: string): Promise<T | null>;
     set<T>(key: string, value: T, ttl?: number): Promise<void>;
     invalidate(pattern: string): Promise<void>;
     stats(): Promise<CacheStats>;
   }

   interface CacheEntry<T> {
     value: T;
     expires: Date;
     hits: number;
   }
   ```

5. Cache features:
   - Configurable TTL per tool type
   - Cache warming for popular requests
   - Intelligent cache invalidation
   - Cache hit/miss metrics
   - Memory pressure handling

### Caching Strategy

- Cache key generation based on tool name + parameters
- Stale-while-revalidate pattern for better UX
- Background cache refresh for popular items
- Circuit breaker integration (serve stale on upstream failure)

## Agent to Use

Invoke the **@brightdata** agent to:

- Review caching strategies for MCP services
- Suggest appropriate TTL values for TikTok data
- Validate cache invalidation patterns
- Guide on cache warming and optimization

## Success Criteria

- [ ] Cache reduces BrightData API calls by 40%+
- [ ] Response times improve for cached requests
- [ ] Cache hit ratio above 60% for repeated requests
- [ ] Memory usage stays within reasonable bounds
- [ ] Cache invalidation works correctly
- [ ] Cache metrics available for monitoring

## Notes

- Use Redis for distributed caching across instances
- Implement cache versioning for schema changes
- Consider cache preloading for common searches
- Monitor cache effectiveness and adjust TTL values
