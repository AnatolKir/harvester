# TikTok Harvester - Critical System Health Fixes

## URGENT: Configuration Issues

### 1. Fix BrightData API Token
The MCP Gateway is failing due to missing BrightData API token:

```bash
# Add to your .env file:
BRIGHTDATA_MCP_API_KEY=your_api_token_here
# Or export in your environment:
export API_TOKEN=your_brightdata_api_token
```

**Impact**: All TikTok discovery and comment harvesting is currently broken.

### 2. Clean Up Multiple Dev Servers
Multiple npm dev processes are running simultaneously:

```bash
# Kill all dev processes
pkill -f "npm run dev"
# Or more specifically:
ps aux | grep "npm run dev" | grep -v grep | awk '{print $2}' | xargs kill

# Then start only one:
cd web && npm run dev
```

**Impact**: Port conflicts, resource waste, unpredictable behavior.

### 3. Environment Validation
Run the built-in environment validator:

```bash
cd web && npm run env:validate
```

## HIGH: Error Monitoring Improvements

### 1. Add Error Monitoring Service
Consider integrating Sentry for production error tracking:

```bash
npm install @sentry/nextjs @sentry/node
```

### 2. Enhanced Logging Structure
Create centralized error logging utility:

```typescript
// /web/src/lib/errors/logger.ts
export interface ErrorContext {
  userId?: string;
  requestId?: string;
  endpoint?: string;
  userAgent?: string;
  timestamp: string;
  environment: string;
}

export function logError(error: Error, context: ErrorContext) {
  // Structured error logging
  console.error({
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    context,
    level: 'error',
    timestamp: new Date().toISOString(),
  });
}
```

### 3. Circuit Breaker Enhancement
The discovery job already has good circuit breaker patterns, but consider adding:

- Health check endpoints for each service
- Automatic recovery strategies
- Dashboard for monitoring circuit breaker states

## MEDIUM: API Error Handling Improvements

### 1. Better Error Boundaries
Enhance React error boundaries with:

```typescript
// /web/src/components/error-boundary.tsx
export class ApiErrorBoundary extends React.Component {
  // Include user-friendly error messages
  // Add retry mechanisms
  // Report errors to monitoring service
}
```

### 2. Validation Error Enhancement
Improve Zod error messages:

```typescript
// Custom error formatter for better UX
function formatValidationErrors(error: ZodError) {
  return error.issues.map(issue => ({
    field: issue.path.join('.'),
    message: getHumanReadableMessage(issue.code, issue.message),
    value: issue.input,
  }));
}
```

### 3. Rate Limit Error Recovery
Add intelligent backoff for rate-limited requests:

```typescript
// /web/src/lib/api/client.ts
async function apiWithRetry(url: string, options: RequestInit) {
  const maxRetries = 3;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        await sleep(parseInt(retryAfter || '60') * 1000);
        continue;
      }
      return response;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(1000 * Math.pow(2, i)); // Exponential backoff
    }
  }
}
```

## LOW: Monitoring & Observability

### 1. Health Check Endpoints
Add comprehensive health checks:

```typescript
// /web/src/app/api/health/route.ts
export async function GET() {
  const checks = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkMcpGateway(),
    checkInngest(),
  ]);
  
  const isHealthy = checks.every(check => check.healthy);
  return NextResponse.json({
    healthy: isHealthy,
    timestamp: new Date().toISOString(),
    checks,
  }, { status: isHealthy ? 200 : 503 });
}
```

### 2. Error Metrics Dashboard
Create admin dashboard for error monitoring:

- Error rates by endpoint
- Failed job statistics  
- Rate limit violations
- System component health status

### 3. Alert System Enhancement
The system already has Slack alerting. Consider adding:

- Email alerts for critical errors
- PagerDuty integration for production
- Alert fatigue prevention (deduplication)

## Testing Error Scenarios

Create test cases for common error scenarios:

```typescript
// /web/src/__tests__/error-handling.test.ts
describe('Error Handling', () => {
  test('API returns proper error format', async () => {
    // Test validation errors
    // Test rate limiting 
    // Test database failures
    // Test authentication errors
  });
  
  test('Frontend handles API errors gracefully', () => {
    // Test error boundaries
    // Test retry mechanisms
    // Test user feedback
  });
});
```

## Implementation Priority

1. **URGENT**: Fix BrightData API token and clean up dev servers
2. **HIGH**: Add error monitoring service and enhance logging
3. **MEDIUM**: Improve API error handling and validation
4. **LOW**: Add comprehensive monitoring and alerting

## Success Metrics

- Zero BrightData API failures
- <1% API error rate
- <5 second error recovery time
- 100% error scenario test coverage