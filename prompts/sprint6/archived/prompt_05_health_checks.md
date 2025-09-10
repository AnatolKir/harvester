# Implement Health Checks

## Objective

Create comprehensive health check endpoints for monitoring the MCP Gateway's connectivity to BrightData and overall system health.

## Context

- Sprint: 6
- Dependencies: prompt_04_mcp_client.md
- Related files: `/mcp-gateway/src/health.ts`

## Task

Implement detailed health checks that verify all critical components of the MCP Gateway are functioning properly.

### Requirements

1. Create `src/health.ts` with health check logic
2. Implement multiple health check levels:
   - **Basic**: Server is running and responding
   - **Ready**: MCP client connected to BrightData
   - **Deep**: Can successfully call a simple tool
3. Create health endpoints:
   - `GET /health` - Basic liveness check
   - `GET /health/ready` - Readiness check
   - `GET /health/deep` - Full functionality check
4. Health response format:
   ```json
   {
     "status": "healthy|degraded|unhealthy",
     "timestamp": "2024-01-01T00:00:00Z",
     "checks": {
       "server": { "status": "pass", "time": "1ms" },
       "mcp_connection": { "status": "pass", "time": "50ms" },
       "brightdata_tools": { "status": "pass", "time": "200ms" }
     }
   }
   ```
5. Add health check middleware for dependency injection
6. Configure appropriate HTTP status codes (200, 503)

### Health Check Logic

- Cache health status for 30 seconds to avoid overwhelming BrightData
- Test actual tool execution in deep health check
- Return degraded status if some components fail
- Include response times for performance monitoring

## Agent to Use

Invoke the **@brightdata** agent to:

- Suggest health check patterns for MCP services
- Review health check implementation for production readiness
- Validate monitoring and alerting integration

## Success Criteria

- [ ] Basic health check returns 200 when server is running
- [ ] Ready check validates MCP connection to BrightData
- [ ] Deep check executes a simple tool successfully
- [ ] Health responses include timing information
- [ ] Failed checks return appropriate 503 status
- [ ] Health status is cached to prevent API spam

## Notes

- Use lightweight tools for deep health checks
- Include version information in health response
- Consider adding metrics about recent request success rates
- Design for easy integration with monitoring systems
