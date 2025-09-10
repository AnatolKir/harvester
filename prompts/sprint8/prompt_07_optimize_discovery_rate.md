# Optimize Discovery Rate

## Objective

Scale up the discovery and harvesting process to achieve the 200-500 domains/week target, addressing the current 86% performance shortfall.

## Context

- Sprint: 8
- Dependencies: prompt_06_setup_monitoring_alerts.md completed
- Related files: `/inngest/discovery.ts`, `/worker/`, rate limiting configuration

## Task

Current performance is 27 domains/week, which is 86% below the minimum MVP target of 200-500 domains/week. Optimize the discovery rate while respecting rate limits and system constraints.

### Current Issues

1. **Severe Underperformance**
   - 27 domains/week vs 200+ target
   - 86% performance gap
   - MVP success metrics not being met

2. **Discovery Frequency**
   - 10-minute cron schedule may be too conservative
   - Limited video discovery per cycle
   - Shallow comment harvesting (1-2 pages only)

3. **Processing Efficiency**
   - Rate limiting may be too restrictive
   - Sequential processing causing bottlenecks
   - Worker capacity underutilized

### Required Actions

1. **Performance Analysis**
   - Measure current discovery and harvesting rates
   - Identify bottlenecks in the pipeline
   - Analyze rate limiting impact

2. **Discovery Optimization**
   - Increase discovery frequency appropriately
   - Expand video search parameters
   - Optimize comment harvesting depth

3. **Parallel Processing**
   - Implement concurrent video processing
   - Batch comment harvesting operations
   - Utilize worker capacity more effectively

4. **Rate Limit Tuning**
   - Adjust token bucket parameters
   - Implement smart backoff strategies
   - Balance speed with sustainability

## Subagent to Use

Invoke the **performance-optimizer** to:

- Analyze current throughput and identify bottlenecks
- Optimize discovery frequency and batch sizes
- Implement parallel processing where safe
- Tune rate limiting for maximum sustainable throughput

## Success Criteria

- [ ] Domain discovery rate increased to 200+ per week
- [ ] Discovery job frequency optimized
- [ ] Comment harvesting depth increased where beneficial
- [ ] Parallel processing implemented safely
- [ ] Rate limiting balanced for performance and sustainability
- [ ] Performance metrics tracked and validated
- [ ] System remains stable under increased load
- [ ] Changes tested and committed with performance notes

## Implementation Steps

1. **Current Performance Baseline**
   ```sql
   -- Measure current rates
   SELECT 
     DATE_TRUNC('day', created_at) as day,
     COUNT(*) as domains_per_day
   FROM domain 
   WHERE created_at > NOW() - INTERVAL '7 days'
   GROUP BY day
   ORDER BY day;
   ```

2. **Discovery Frequency Tuning**
   ```typescript
   // Current: every 10 minutes
   { cron: "*/10 * * * *" }
   
   // Optimization options:
   { cron: "*/5 * * * *" }  // Every 5 minutes
   { cron: "*/3 * * * *" }  // Every 3 minutes (peak hours)
   ```

3. **Batch Size Optimization**
   ```python
   # Current settings
   MAX_VIDEOS_PER_DISCOVERY = 10
   MAX_COMMENT_PAGES = 2
   
   # Optimized settings
   MAX_VIDEOS_PER_DISCOVERY = 20  # More videos per cycle
   MAX_COMMENT_PAGES = 3          # Deeper comment harvesting
   ```

4. **Parallel Processing**
   ```python
   import asyncio
   
   async def process_videos_concurrently(video_urls):
     tasks = [harvest_comments(url) for url in video_urls]
     results = await asyncio.gather(*tasks, return_exceptions=True)
     return results
   ```

## Optimization Strategies

### 1. Discovery Frequency
- **Conservative**: 5-minute intervals (from 10)
- **Aggressive**: 3-minute intervals during peak hours
- **Dynamic**: Adjust based on success rate

### 2. Comment Harvesting
- **Current**: 1-2 pages per video
- **Optimized**: 3-4 pages for high-engagement videos
- **Smart**: Skip low-engagement videos faster

### 3. Video Selection
- **Current**: Basic promoted video search
- **Enhanced**: Multiple search terms and hashtags
- **Targeted**: Focus on high-domain-probability content

### 4. Rate Limiting
- **Token Bucket**: Increase burst capacity
- **Backoff**: Implement exponential backoff
- **Priority**: Prioritize high-value operations

## Performance Targets

### Weekly Targets
- **Minimum**: 200 domains/week (7x current)
- **Target**: 350 domains/week (13x current)  
- **Stretch**: 500 domains/week (18x current)

### Daily Breakdown
- **Minimum**: 29 domains/day
- **Target**: 50 domains/day
- **Stretch**: 71 domains/day

### Hourly Requirements
- **Peak hours**: 5+ domains/hour
- **Normal hours**: 2-3 domains/hour
- **Off hours**: 1+ domains/hour

## Risk Management

### Rate Limiting Risks
- Monitor for 429 responses
- Implement circuit breaker patterns
- Have fallback to slower rates

### System Stability
- Monitor resource usage increase
- Watch for memory leaks or CPU spikes
- Test under sustained load

### Data Quality
- Ensure precision doesn't decrease with speed
- Monitor false positive rates
- Validate extraction quality at higher volumes

## Monitoring Integration

Track new performance metrics:
- Domains extracted per hour
- Discovery job success rate
- Comment pages processed per video
- Rate limit hit frequency
- End-to-end processing time

## Notes

- Start conservatively and increase gradually
- Monitor system stability during optimization
- Rollback capability if issues arise
- Balance speed with sustainability

## Handoff Notes

After completion:
- Discovery rate optimized to meet targets
- Performance monitoring operational
- Ready for final integration testing in prompt_08