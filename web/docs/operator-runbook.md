# Operator Runbook

## Concepts

- Dead Letter Queue (DLQ): A holding area for jobs that have failed after the system's built-in retry attempts. Items here require human attention to either retry (after fixing root causes) or delete if no longer relevant.
- RBAC (Role-Based Access Control): A security model that restricts features and endpoints to authorized roles (e.g., Admins). Only users granted the Admin role can access `/admin/*` routes and perform DLQ actions.

## Circuit Breaker (MCP)

- Purpose: Protect the system from cascading failures when the MCP provider is failing or timing out.
- States:
  - `closed`: Normal operation; failures increment a counter.
  - `open`: Too many recent failures; requests fast-fail until cool-down.
  - `half-open`: Cool-down elapsed; limited trial requests allowed. On first success the breaker closes; on failure it re-opens.
- Defaults (tunable via env):
  - `MCP_CB_FAILURE_THRESHOLD` = 5 failures
  - `MCP_CB_COOLDOWN_MS` = 60000 ms

Detection → Diagnosis → Mitigation → Verification

1. Detection
   - Alerts: Job success rate drops below threshold, increased MCP-related errors in `system_logs`.
   - Admin Jobs: `/admin/jobs` shows `mcpCircuitBreaker.state` and counts.

2. Diagnosis
   - Check recent `system_logs` for `mcp` errors/timeouts and corresponding job failures.
   - Confirm breaker status via `GET /api/admin/jobs`.

3. Mitigation
   - Wait for cool-down; system will probe in `half-open` automatically.
   - Optionally reduce throughput (lower RPM or concurrency) using `POST /api/admin/config` keys:
     - `max_concurrent_discovery_jobs`, `max_concurrent_harvesting_jobs`, and relevant RPMs.
   - If provider-wide outage: activate Kill Switch temporarily at `/admin/kill-switch`.

4. Verification
   - Ensure `mcpCircuitBreaker.state` returns to `closed`.
   - Success rate returns above alert threshold and DLQ growth stabilizes.

## Dead Letter Queue (DLQ) Management

- Path: `/admin/dead-letter-queue` (admin-only)
- Purpose: Inspect failed jobs, schedule retries, or permanently delete entries.

### How to Use

- Filter by status (All, Pending, Retry Scheduled).
- Review columns: id, job type, error, first/last failure, attempts, payload summary.
- Actions:
  - Retry: schedules the job for retry and records an entry in `system_logs` with `event_type=dlq_retry`.
  - Delete: permanently removes the DLQ item and records `event_type=dlq_delete`.

### API Endpoints

- List: `GET /api/admin/dead-letter-queue?status=pending|retry_scheduled`
- Retry: `POST /api/admin/dead-letter-queue` with `{ dlqId, requestedBy }`
- Delete: `DELETE /api/admin/dead-letter-queue` with `{ dlqId, requestedBy }`

### RBAC

- Routes enforce admin via middleware and allowed origins.
- UI actions include the authenticated admin email (`requestedBy`).

### Troubleshooting

- If actions fail, check `system_logs` for `dlq_*` events and errors.
- Ensure `NEXT_PUBLIC_BASE_URL` and Supabase keys are configured.

## Kill Switch

- Path: `/admin/kill-switch` (admin-only)
- Actions: Activate/Deactivate with required reason; all actions logged in `system_logs`.

## Health & Jobs

- Path: `/admin/jobs` (admin-only)
- Review job metrics and health indicators.

## Materialized Views (Matviews)

- Purpose: Faster UI queries under load by serving from precomputed views.
- Toggle: `MATVIEWS_ENABLED=true|false` (defaults to false). When disabled, API automatically reads from normal SQL views.
- Refresh Job: Inngest function `materialized-views-refresh` runs on a schedule (every 5 min) and executes `refresh_matviews()`.

Procedures

1. Detection
   - UI slowness or heavy query load; check `system_logs` for refresh failures.

2. Diagnosis
   - Confirm `MATVIEWS_ENABLED` value in environment.
   - Check Inngest logs for the refresh job and DB logs for lock/contention.

3. Mitigation
   - Temporarily set `MATVIEWS_ENABLED=false` to fall back to normal views.
   - Re-run refresh off-peak or increase refresh interval.

4. Verification
   - UI latencies normalize; refresh job succeeds without errors.

## Backfill (Discovery)

- Admin API: `POST /api/admin/jobs {"action":"trigger_backfill","days":7,"limit":100}`
- UI: `/admin/jobs/backfill` (if enabled in navigation)
- Notes: Respects `DISCOVERY_RPM`; idempotent upserts; resumes from checkpoint.

Procedure

1. Detection
   - Gaps in historical coverage or audit request from stakeholders.

2. Diagnosis
   - Confirm recent discovery rates and backlog capacity in `/admin/jobs`.

3. Mitigation
   - Trigger limited backfill (smaller `days` and `limit` first). Monitor DLQ and success rate.

4. Verification
   - New domains appear for the requested window; no sustained error rate increase.

## CSV Exports

- UI: `/admin/exports` → Download Domains CSV (time range) or Domain Mentions CSV (with optional `since`).
- API:
  - `GET /api/domains/export?dateFilter=all|today|week|month`
  - `GET /api/domains/{id}/mentions/export?since=<ISO8601>`
- Notes: Streaming CSV; large exports may take time. Validate `dateFilter` and `since` before sharing files externally.
