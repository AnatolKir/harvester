# MCP Gateway

A gateway server that translates custom MCP (Model Context Protocol) tools to BrightData's standard MCP service.

## Features

- **Express.js Server**: Robust HTTP server with middleware stack
- **Security**: Helmet for security headers, CORS configuration, rate limiting
- **Logging**: Structured logging with Winston, request tracking with unique IDs
- **Error Handling**: Global error handler with structured JSON responses
- **Health Monitoring**: Health check endpoints for liveness and readiness probes
- **Graceful Shutdown**: Handles SIGTERM/SIGINT signals properly

## Setup

```bash
cd mcp-gateway
npm install
cp .env.example .env
```

## Development

```bash
npm run dev  # Runs on port 3333 by default
```

## Building

```bash
npm run build
npm start
```

## Testing

```bash
npm test
npm run test:watch
```

## Linting & Formatting

```bash
npm run lint
npm run lint:fix
npm run format
npm run format:check
npm run typecheck
```

## API Endpoints

### Health Check

- `GET /health` - Main health check endpoint (returns uptime, status, timestamp)
- `GET /health/ready` - Readiness probe
- `GET /health/live` - Liveness probe

### MCP Tool Execution

- `POST /mcp` - Execute MCP tool
  ```json
  {
    "tool": "tool_name",
    "params": {
      "key": "value"
    }
  }
  ```

### Tools (Legacy)

- `GET /tools` - List available tools
- `POST /tools/execute` - Execute a tool

### Metrics

- `GET /metrics` - Server metrics (uptime, memory usage)

### Service Info

- `GET /` - Service information and available endpoints

## Environment Variables

- `PORT` - Server port (default: 3333)
- `NODE_ENV` - Environment (development/production)
- `LOG_LEVEL` - Log level (default: info)
- `LOG_FORMAT` - Log format (json/simple/pretty, default: json)
- `CORS_ORIGIN` - CORS allowed origins (default: \*)
- `RATE_LIMIT_WINDOW_MS` - Rate limit window in milliseconds
- `RATE_LIMIT_MAX_REQUESTS` - Max requests per window

## Project Structure

```
/mcp-gateway/
  /src/
    /server.ts      - Main Express server class
    /index.ts       - Application entry point
    /middleware/    - Express middleware
      errorHandler.ts
      requestLogger.ts
      rateLimiter.ts
    /routes/        - API routes
      health.ts
      tools.ts
    /utils/         - Utility functions
      logger.ts
    /types/         - TypeScript type definitions
  /tests/          - Test files
  /docker/         - Docker configuration
```

## Middleware Stack

1. **Helmet** - Security headers
2. **CORS** - Cross-origin resource sharing
3. **Rate Limiting** - Token bucket rate limiting per IP
4. **Body Parser** - JSON and URL-encoded body parsing (10MB limit)
5. **Request Logger** - Logs all requests with unique IDs
6. **Error Handler** - Catches and formats all errors

## Error Handling

All errors are returned in a consistent JSON format:

```json
{
  "error": {
    "message": "Error message",
    "statusCode": 400,
    "stack": "...", // Only in development
    "details": {} // Only in development
  }
}
```

## Graceful Shutdown

The server handles graceful shutdown on:

- SIGTERM signal
- SIGINT signal (Ctrl+C)
- Uncaught exceptions
- Unhandled promise rejections

## Next Steps

- Implement actual MCP tool execution logic
- Integrate with BrightData's MCP service
- Add authentication/authorization
- Implement proper metrics collection
- Add request/response validation with Zod
