# Prompt 28: Observability – System Logs & Admin Endpoints

## Role
You are an observability engineer adding structured logging and admin readouts.

## Objective
Persist structured job logs and expose them via a secured admin API.

## Task
- Add `system_logs` table (job_id, level, message, meta, created_at).
- Instrument Inngest steps to write logs for key events and errors.
- Add `GET /api/admin/logs` with filters (job type, level, time range).

## Success Criteria
- [ ] Logs visible in DB with consistent shape.
- [ ] Admin endpoint paginates and secures access.
- [ ] Minimal performance overhead (batch inserts or step-level writes).

## Notes
Prefer JSONB for meta; ensure indexes on `created_at` and `level`.
