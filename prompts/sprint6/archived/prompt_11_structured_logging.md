# Add Structured Logging

## Objective

Implement comprehensive structured logging for the MCP Gateway to enable effective monitoring, debugging, and operational insights.

## Context

- Sprint: 6
- Dependencies: prompt_10_caching_layer.md
- Related files: `/mcp-gateway/src/logger.ts`

## Task

Create a production-ready logging system that provides detailed visibility into gateway operations, performance, and errors.

### Requirements

1. Create `src/logger.ts` with structured logging setup
2. Logging framework configuration:
   - Use Winston for structured logging
   - JSON format for production
   - Console format for development
   - Multiple transport support (file, console, external)
3. Log levels and categories:
   - **ERROR**: System errors, API failures
   - **WARN**: Rate limits, degraded performance
   - **INFO**: Request completion, tool execution
   - **DEBUG**: Detailed request/response data
4. Structured log format:
   ```json
   {
     "timestamp": "2024-01-01T00:00:00Z",
     "level": "info",
     "service": "mcp-gateway",
     "operation": "tool_execution",
     "tool_name": "tiktok.ccl.search",
     "session_id": "sess_123",
     "duration_ms": 250,
     "success": true,
     "metadata": {
       "request_id": "req_456",
       "user_agent": "..."
     }
   }
   ```
5. Logging middleware:
   - Request/response logging
   - Performance timing
   - Error context capture
   - Correlation ID tracking

### Logging Features

- Sensitive data redaction (API keys, user data)
- Log sampling for high-volume operations
- Contextual logging with request correlation
- Performance metrics integration
- External log shipping (optional)

## Agent to Use

Invoke the **@brightdata** agent to:

- Review logging best practices for MCP services
- Suggest log structure for debugging BrightData issues
- Validate sensitive data handling
- Guide on log retention and shipping strategies

## Success Criteria

- [ ] All operations logged with appropriate detail
- [ ] Structured JSON logs in production
- [ ] Request correlation IDs throughout pipeline
- [ ] Sensitive data properly redacted
- [ ] Performance timing captured
- [ ] Log levels configurable via environment

## Notes

- Include tool execution timing for performance analysis
- Log BrightData API response codes and errors
- Consider log aggregation for multi-instance deployment
- Implement log rotation for file-based logging
