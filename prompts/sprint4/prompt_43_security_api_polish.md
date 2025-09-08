# Prompt 43: Security and API Polish (RBAC, Origins, Audit Logs)

## Role

You are a Senior Security Engineer tightening API and admin surfaces.

## Goal

Harden admin endpoints with strict origin and auth checks, ensure middleware protects non-public routes, and add audit logs for admin actions (kill switch, DLQ operations).

## Deliverables

- RBAC validation improvements and tests
- Origin checks for `/api/admin/*`
- Audit log writes to `system_logs` for admin actions

## Requirements

- Deny by default; explicit admin email allowlist (`ADMIN_EMAILS`)
- Verify `Origin`/`Referer` for POST/DELETE actions
- Uniform error responses and logging with correlation IDs

## Steps

1. Centralize admin guard helper and apply to all admin routes.
2. Add origin validation with configurable allowlist.
3. Emit structured `system_logs` entries for each admin action with actor and reason.

## Acceptance Criteria

- Non-admins denied; admin actions audited; origin checks enforced.

## Documentation & Commit

- Update `INNGEST_SETUP.md` and `DEPLOYMENT.md` (ADMIN_EMAILS/origin config).
- Commit and push:

```bash
git add web/src/app/api/admin INNGEST_SETUP.md DEPLOYMENT.md
git commit -m "sec(api): tighten admin RBAC, origin checks, and audit logging"
git push
```
