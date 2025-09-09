# Prompt 49: MCP Circuit Breaker and Backoff

## Role

You are a Senior Platform/Resilience Engineer increasing robustness of external calls.

## Goal

Introduce a circuit breaker around MCP requests with exponential backoff and jitter. Expose breaker status in admin metrics and logs.

## Deliverables

- `web/src/lib/mcp/circuitBreaker.ts`
- Integration in discovery/harvesting jobs
- Admin jobs API exposes breaker state

## Requirements

- States: closed → open → half-open
- Fast-fail when open; auto half-open after cool-down
- Config via env (`MCP_CB_FAILURE_THRESHOLD`, `MCP_CB_COOLDOWN_MS`)

## Steps

1. Implement reusable circuit breaker util with counters and timestamps.
2. Wrap MCP calls in discovery and harvesting; log transitions.
3. Add admin endpoint field to return breaker status.

## Acceptance Criteria

- When MCP errors exceed threshold, further calls short-circuit until cool-down
- Status visible on `/admin/jobs` page

## Documentation & Commit

```bash
git add web/src/lib/mcp/circuitBreaker.ts inngest/jobs/*.ts web/src/app/api/admin/jobs/route.ts
git commit -m "feat(resilience): circuit breaker and backoff for MCP calls"
git push
```
