# Operator Runbook

## Concepts

- Dead Letter Queue (DLQ): A holding area for jobs that have failed after the system's built-in retry attempts. Items here require human attention to either retry (after fixing root causes) or delete if no longer relevant.
- RBAC (Role-Based Access Control): A security model that restricts features and endpoints to authorized roles (e.g., Admins). Only users granted the Admin role can access `/admin/*` routes and perform DLQ actions.

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
