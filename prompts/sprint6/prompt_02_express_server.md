# Implement Core Express Server

## Objective

Create the foundational Express.js server with basic routing, middleware, and error handling for the MCP Gateway.

## Context

- Sprint: 6
- Dependencies: prompt_02_gateway_structure.md
- Related files: `/mcp-gateway/src/server.ts`

## Task

Implement the core HTTP server that will handle MCP tool requests and proxy them to BrightData's service.

### Requirements

1. Create `src/server.ts` with Express application
2. Configure middleware:
   - JSON body parsing
   - CORS handling
   - Request logging
   - Error handling
3. Define base routes:
   - `GET /health` - Health check endpoint
   - `POST /mcp` - Main MCP tool execution endpoint
   - `GET /metrics` - Metrics endpoint (placeholder)
4. Implement proper error handling with structured responses
5. Configure server to listen on port 3333 (configurable via environment)
6. Add graceful shutdown handlers

### Server Structure

```typescript
// Basic structure should include:
- App initialization
- Middleware registration
- Route definitions
- Error handling middleware
- Server startup with proper logging
```

## Agent to Use

Invoke the **@brightdata** agent to:

- Review Express server configuration for MCP gateway patterns
- Suggest middleware best practices for MCP request handling
- Validate error handling approach

## Success Criteria

- [ ] Express server starts successfully on port 3333
- [ ] Health check endpoint returns 200 OK
- [ ] Request logging shows incoming requests
- [ ] Error handling returns proper JSON responses
- [ ] Graceful shutdown works with SIGTERM/SIGINT
- [ ] TypeScript compiles without errors

## Notes

- Keep server lightweight and focused on proxying
- Use structured logging for debugging
- Ensure proper HTTP status codes
- Handle both sync and async route handlers
