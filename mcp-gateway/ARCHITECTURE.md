# MCP Gateway Architecture

## Overview

The MCP Gateway serves as a translation layer between custom tools and BrightData's standard Model Context Protocol (MCP) service. It provides a RESTful API interface for tool execution with built-in security, logging, and rate limiting.

## Core Components

### 1. Express Server (`src/index.ts`)

- Main application entry point
- Configures middleware stack
- Sets up routing
- Handles graceful shutdown

### 2. Middleware Layer (`src/middleware/`)

#### Error Handler

- Centralized error handling
- Environment-aware error responses
- Structured error logging

#### Request Logger

- Unique request ID generation
- Request/response timing
- Structured logging with Winston

#### Rate Limiter

- Token bucket pattern
- Configurable limits per IP
- Standard rate limit headers

### 3. Routes (`src/routes/`)

#### Health Routes

- `/health` - Overall system health
- `/health/ready` - Readiness probe for k8s
- `/health/live` - Liveness probe for k8s

#### Tools Routes

- `GET /tools` - List available tools
- `POST /tools/execute` - Execute a specific tool

### 4. Types (`src/types/`)

- TypeScript interfaces for MCP protocol
- Tool execution request/response types
- Error structure definitions

## Security Features

1. **Helmet.js** - Sets security headers
2. **CORS** - Configurable origin restrictions
3. **Rate Limiting** - Prevents abuse
4. **Input Validation** - JSON schema validation (planned)
5. **Request Size Limits** - 10MB max payload

## Logging Strategy

- **Winston** logger with multiple transports
- Structured JSON logging for production
- Pretty printing for development
- Separate error and combined logs
- Request correlation via unique IDs

## Configuration

Environment-based configuration via `.env`:

- Server settings (PORT, HOST)
- MCP configuration
- BrightData integration
- Security settings (CORS, rate limits)
- Logging preferences

## Testing Strategy

- **Jest** for unit and integration tests
- **Supertest** for HTTP endpoint testing
- Test coverage reporting
- Isolated test environment

## Development Workflow

1. **Hot Reload** - TSX watch mode
2. **Type Checking** - Strict TypeScript
3. **Linting** - ESLint with TypeScript rules
4. **Formatting** - Prettier configuration
5. **Pre-commit Hooks** - Planned with Husky

## Deployment Considerations

### Production Ready Features

- Health check endpoints for orchestrators
- Graceful shutdown handling
- Environment-specific configuration
- Structured logging for observability
- Error tracking ready

### Scaling Strategy

- Stateless design for horizontal scaling
- External rate limiting via Redis (planned)
- Connection pooling for databases
- Caching layer ready

## Future Enhancements

1. **Tool Registry** - Dynamic tool registration
2. **Authentication** - JWT/API key support
3. **Metrics** - Prometheus integration
4. **Tracing** - OpenTelemetry support
5. **WebSocket** - Real-time tool execution
6. **Queue Integration** - Async job processing

## Dependencies

### Core

- Express.js - Web framework
- TypeScript - Type safety
- @modelcontextprotocol/sdk - MCP integration

### Security & Middleware

- Helmet - Security headers
- CORS - Cross-origin support
- express-rate-limit - Rate limiting

### Development

- TSX - TypeScript execution
- Jest - Testing framework
- ESLint - Code quality
- Prettier - Code formatting

## Directory Structure

```
mcp-gateway/
├── src/
│   ├── index.ts           # Application entry
│   ├── middleware/         # Express middleware
│   │   ├── errorHandler.ts
│   │   ├── requestLogger.ts
│   │   └── rateLimiter.ts
│   ├── routes/            # API endpoints
│   │   ├── health.ts
│   │   └── tools.ts
│   ├── types/             # TypeScript definitions
│   │   └── index.ts
│   └── utils/             # Utilities
│       └── logger.ts
├── tests/                 # Test files
│   ├── routes/
│   │   └── health.test.ts
│   └── setup.ts
├── docker/                # Docker configs
├── .env.example          # Environment template
├── tsconfig.json         # TypeScript config
├── jest.config.js        # Jest configuration
├── package.json          # Dependencies
└── README.md             # Documentation
```
