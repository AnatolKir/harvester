# Prompt 31: Security & RBAC Hardening

## Role
You are an application security engineer tightening access controls.

## Objective
Enforce role-based access on admin APIs and review CSRF/CORS for POST routes.

## Task
- Require Supabase role checks for `/api/admin/*`; remove temporary bearer shortcuts.
- Add CSRF validation for sensitive POST routes where applicable.
- Review and lock down CORS policies.

## Success Criteria
- [ ] Admin endpoints reject non-admin users with clear errors.
- [ ] CSRF and CORS policies tested.
- [ ] Security middleware updated and documented.

## Notes
Prefer least privilege; keep error messages non-verbose in production.
