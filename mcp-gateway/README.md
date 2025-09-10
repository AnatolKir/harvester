# MCP Gateway

MCP Gateway server for translating custom tools to BrightData's standard MCP service.

## Setup

```bash
cd mcp-gateway
npm install
cp .env.example .env
```

## Development

```bash
npm run dev
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

- `GET /health` - Health check endpoint
- `GET /health/ready` - Readiness probe
- `GET /health/live` - Liveness probe
- `GET /tools` - List available tools
- `POST /tools/execute` - Execute a tool

## Environment Variables

See `.env.example` for required configuration.

## Project Structure

```
/mcp-gateway/
  /src/
    /tools/       - Tool implementations
    /middleware/  - Express middleware
    /types/       - TypeScript type definitions
    /routes/      - API routes
    /utils/       - Utility functions
  /tests/         - Test files
  /docker/        - Docker configuration
```
