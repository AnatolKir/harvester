# Prompt 40: Inngest Backfill Job with Pacing & Idempotency

## Role

You are an Inngest/Jobs Specialist optimizing throughput and safety.

## Goal

Create a backfill job to fetch last N days from CCL with strict global rate limits and idempotent upserts.

## Deliverables

- `inngest/jobs/discovery-backfill.ts`
- Wiring from admin to trigger backfill with params (days, limit)
- System config entries to track progress

## Requirements

- Respect `DISCOVERY_RPM` using existing rate-limit utilities
- Idempotent upserts on `video(video_id)`; retries safe
- Progress/logging to `system_logs` and `job_status`

## Steps

1. Implement job with paging windows over days.
2. Acquire tokens before MCP calls; jitter to avoid bursts.
3. Persist progress checkpoints in `system_config`.

## Acceptance Criteria

- Backfill completes within RPM; restart resumes from checkpoint.

## Documentation & Commit

- Update `INNGEST_SETUP.md` with backfill instructions.
- Commit and push:

```bash
git add inngest/jobs/discovery-backfill.ts INNGEST_SETUP.md
git commit -m "feat(inngest): backfill job with pacing and idempotent upserts"
git push
```
