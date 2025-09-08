# Prompt 34: Admin UI – Kill Switch Controls

## Role

You are a Senior Next.js Engineer building secure admin control surfaces.

## Goal

Create `/admin/kill-switch` SSR page to view status and toggle the global kill switch via existing `/api/admin/kill-switch` endpoints.

## Deliverables

- `web/src/app/admin/kill-switch/page.tsx` (SSR)
- Minimal UI components (confirm dialog, status badge)

## Requirements

- Admin-only access (respect middleware + RBAC via `ADMIN_EMAILS`).
- Show current status, reason, requestedBy, timestamp.
- Actions: Activate (POST), Deactivate (DELETE) with confirmation.
- Log admin actions to `system_logs` via API or job.

## Steps

1. Implement SSR page that calls admin API server-side.
2. Add action handlers using server actions or route handlers with CSRF-safe calls.
3. Ensure strict typing and proper error states.

## Acceptance Criteria

- Admins can view and toggle kill switch; non-admins denied.
- Actions are logged with actor identity.

## Documentation & Commit

- Document in `INNGEST_SETUP.md` and `web/README.md` (Operator guide).
- Commit and push:

```bash
git add web/src/app/admin/kill-switch INNGEST_SETUP.md web/README.md
git commit -m "feat(admin): kill switch SSR page with RBAC and action logging"
git push
```
