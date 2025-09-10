# Create Metrics Endpoint

## Objective

Implement a comprehensive metrics endpoint for monitoring MCP Gateway performance, usage, and health.

## Context

- Sprint: 6
- Dependencies: prompt_12_circuit_breakers.md
- Related files: `/mcp-gateway/src/metrics.ts`

## Task

Create detailed metrics collection and exposure for operational visibility into gateway performance and usage patterns.

### Requirements

1. Create `src/metrics.ts` with metrics collection logic
2. Metrics categories:
   - **Request metrics**: Total requests, response times, error rates
   - **Tool metrics**: Per-tool usage, success rates, performance
   - **System metrics**: Memory usage, CPU, connection counts
   - **BrightData metrics**: API calls, quotas, rate limits
3. Metrics endpoint structure:
   ```
   GET /metrics
   ```
   Returns Prometheus-compatible metrics format
4. Key metrics to track:

   ```
   # Request metrics
   http_requests_total{method, status}
   http_request_duration_seconds{tool}
   http_requests_in_flight

   # Tool metrics
   mcp_tool_calls_total{tool, status}
   mcp_tool_duration_seconds{tool}
   mcp_tool_errors_total{tool, error_type}

   # Cache metrics
   cache_hits_total{cache_type}
   cache_misses_total{cache_type}
   cache_size_bytes{cache_type}

   # Circuit breaker metrics
   circuit_breaker_state{tool}
   circuit_breaker_failures_total{tool}
   ```

5. Metrics collection features:
   - Real-time metric updates
   - Histogram buckets for latency
   - Counter and gauge metric types
   - Custom labels for filtering

### Metrics Implementation

- Use `prom-client` for Prometheus compatibility
- Middleware for automatic request tracking
- Custom metric helpers for business logic
- Memory-efficient metric storage

## Agent to Use

Invoke the **@brightdata** agent to:

- Review metrics strategy for MCP services
- Suggest key performance indicators to track
- Validate Prometheus metrics format
- Guide on alerting and dashboard integration

## Success Criteria

- [ ] Metrics endpoint returns Prometheus format
- [ ] All key operations tracked with metrics
- [ ] Response time histograms capture performance
- [ ] Error rates and types properly categorized
- [ ] Circuit breaker states visible in metrics
- [ ] Memory usage remains reasonable with metrics

## Notes

- Include BrightData quota usage if available
- Track cache effectiveness metrics
- Consider custom business metrics (domains discovered/hour)
- Plan for metric retention and aggregation
