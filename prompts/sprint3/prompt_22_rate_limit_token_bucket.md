# Prompt 22: Global Token Bucket Rate Limiting

## Role
You are a rate limiting specialist designing safe, global pacing.

## Objective
Implement DISCOVERY_RPM and COMMENTS_RPM token buckets (Upstash Redis) and enforce them inside Inngest jobs.

## Context
- Env already defines `DISCOVERY_RPM` and `COMMENTS_RPM`.
- Existing rate-limit util exists under `web/src/lib/rate-limit/*`.

## Task
- Add helpers to acquire tokens per tool: discovery vs comments.
- Wire checks into `inngest/jobs/discovery.ts` and `inngest/jobs/harvesting.ts` before MCP calls.
- Ensure fairness (burst ≤ 1x RPM) and graceful backoff when tokens unavailable.

## Success Criteria
- [ ] Jobs block or delay until token available; no busy loops.
- [ ] Respect per-minute quotas across parallel executions.
- [ ] Logs include wait durations and remaining tokens.
- [ ] Unit tests for token acquisition under contention.

## Notes
Prefer a small jitter to avoid thundering herds; keep implementation simple and clear.
