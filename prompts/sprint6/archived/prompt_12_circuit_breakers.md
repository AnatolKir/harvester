# Implement Circuit Breakers

## Objective

Add circuit breaker patterns to the MCP Gateway to handle BrightData service failures gracefully and prevent cascade failures.

## Context

- Sprint: 6
- Dependencies: prompt_11_structured_logging.md
- Related files: `/mcp-gateway/src/circuit-breaker.ts`

## Task

Implement circuit breakers that protect the gateway from upstream failures and provide degraded functionality when BrightData is unavailable.

### Requirements

1. Create `src/circuit-breaker.ts` with circuit breaker logic
2. Circuit breaker states:
   - **CLOSED**: Normal operation, requests pass through
   - **OPEN**: Failures detected, requests fail fast
   - **HALF_OPEN**: Testing if service recovered
3. Circuit breaker configuration:
   - Failure threshold: 5 consecutive failures
   - Recovery timeout: 30 seconds
   - Success threshold: 3 successes to close
   - Request timeout: 10 seconds
4. Implementation components:

   ```typescript
   class CircuitBreaker {
     async execute<T>(operation: () => Promise<T>): Promise<T>;
     getState(): CircuitState;
     getStats(): CircuitStats;
     reset(): void;
   }

   enum CircuitState {
     CLOSED = 'closed',
     OPEN = 'open',
     HALF_OPEN = 'half_open',
   }
   ```

5. Failure handling strategies:
   - Return cached responses when circuit is open
   - Provide meaningful error messages
   - Log circuit state changes
   - Expose circuit status via health checks

### Circuit Breaker Features

- Per-tool circuit breakers (different tools, different thresholds)
- Exponential backoff for recovery attempts
- Circuit breaker metrics for monitoring
- Manual circuit reset via admin API
- Integration with alerting systems

## Agent to Use

Invoke the **@brightdata** agent to:

- Review circuit breaker patterns for MCP services
- Suggest appropriate thresholds for BrightData integration
- Validate failure detection and recovery strategies
- Guide on fallback mechanisms and degraded service

## Success Criteria

- [ ] Circuit breakers detect BrightData failures
- [ ] Requests fail fast when circuit is open
- [ ] Automatic recovery when service is restored
- [ ] Circuit state exposed via health checks
- [ ] Fallback responses provided when possible
- [ ] Circuit breaker metrics logged and monitored

## Notes

- Implement different thresholds for different tools
- Consider partial circuit breakers (some tools work, others don't)
- Integrate with caching layer for fallback responses
- Plan for manual intervention during extended outages
