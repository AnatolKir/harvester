# Prompt 36: Admin UI – Dead Letter Queue Management

## Role

You are a Senior Backend/UI Engineer specializing in reliability tooling.

## Goal

Create `/admin/dlq` SSR page to list failed jobs, filter by status, and provide retry/delete actions using `/api/admin/dead-letter-queue` endpoints.

## Deliverables

- `web/src/app/admin/dead-letter-queue/page.tsx` (SSR)
- Action handlers for retry/delete

## Requirements

- Admin-only access with RBAC
- Columns: id, job type, error, first/last failure, attempts, payload summary
- Actions: Retry (POST /retry), Delete (DELETE)
- Log admin actions to `system_logs`

## Steps

1. Implement server-side list with filters and pagination.
2. Wire retry/delete handlers; confirm dialogs.
3. Show toast/status feedback.

## Acceptance Criteria

- Admins can reliably retry/delete DLQ entries; logs record actions.

## Documentation & Commit

- Update operator docs and runbook for DLQ procedures.
- Commit and push:

```bash
git add web/src/app/admin/dead-letter-queue INNGEST_SETUP.md
git commit -m "feat(admin): DLQ management UI with retry/delete and logging"
git push
```
