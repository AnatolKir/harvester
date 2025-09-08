# Prompt 23: MCP Error Handling, Backoff, Idempotency

## Role
You are a resilience engineer focused on reliable external calls.

## Objective
Categorize MCP errors, implement exponential backoff with jitter, and enforce idempotency in writes.

## Task
- Add a thin error classifier around `MCPClient.call()` (4xx vs 5xx/timeouts/rate-limit).
- In jobs, retry 5xx/timeouts with exponential backoff; fail-fast on 4xx.
- Add idempotency keys to prevent duplicate upserts inside loops (track processed IDs per step).
- Ensure logs surface MCP status and body for observability.

## Success Criteria
- [ ] Backoff curve with capped retries and jitter.
- [ ] No duplicate `video` or `comment` rows when retried.
- [ ] Structured logs for MCP failures with status/body snippet.

## Notes
Keep logic within job steps; avoid over-abstracting. Prefer clarity over cleverness.
