# Prompt 30: Inngest Cloud Readiness

## Role
You are a platform engineer preparing local → cloud parity.

## Objective
Configure Inngest Cloud keys, local dev flow, and minimal admin health UI.

## Task
- Add env wiring for `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY`.
- Document running `inngest dev` vs Cloud webhook path.
- Build a small admin page showing job statuses and offering manual triggers.

## Success Criteria
- [ ] Local and cloud flows documented and tested.
- [ ] Admin page loads and triggers jobs safely.
- [ ] Security policies enforced (admin-only).

## Notes
Keep the admin page simple and server-side where possible.
