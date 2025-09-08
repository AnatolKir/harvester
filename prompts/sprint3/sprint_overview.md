# Sprint 3 – Hardening, Observability, and UI Wiring

## Goals
- Production-grade pacing, retries, and idempotency for MCP-driven jobs.
- Schema-first SQL views powering a live SSR UI (no mocks).
- Operational visibility (logs, metrics) and basic alerting.
- Security/RBAC tightening and Inngest Cloud readiness.

## Prompts
- See `prompt_22` – `prompt_31` in this directory.

## Success Criteria
- Jobs respect DISCOVERY_RPM/COMMENTS_RPM with stable throughput and no burst bans.
- Dashboard and `/domains` pages render live data from Supabase views.
- System logs and metrics available via admin endpoints; basic alerts fire on thresholds.
- Admin APIs are role-gated; Inngest Cloud keys configured and documented.
