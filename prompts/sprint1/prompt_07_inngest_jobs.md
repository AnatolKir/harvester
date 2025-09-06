# Inngest Job Configuration

## Objective

Configure Inngest for cron jobs and retry logic for the TikTok harvester system.

## Context

- Sprint: 1
- Dependencies: None (independent job scheduling)
- Related files: /inngest/, /web/app/api/inngest/, CLAUDE.md

## Task

Set up Inngest job scheduling:

- Configure Inngest client
- Create discovery cron job (10-minute intervals)
- Implement retry logic for failed jobs
- Set up webhook endpoint
- Add job monitoring utilities
- Create kill switch mechanism

## Subagent to Use

Invoke the **Task** subagent with type "general-purpose" to:

- Initialize Inngest client in /inngest/
- Create job definitions for discovery and harvesting
- Set up cron schedules and retry policies
- Implement webhook handler in Next.js
- Add job status tracking
- Create emergency stop functionality

## Success Criteria

- [ ] Inngest client properly configured
- [ ] Discovery job scheduled every 10 minutes
- [ ] Retry logic working for failures
- [ ] Webhook endpoint receiving events
- [ ] Job status visible in Inngest dashboard
- [ ] Kill switch can stop all jobs
- [ ] Proper error handling and logging
- [ ] TypeScript types for all events

## Notes

Use Inngest cloud for MVP (self-hosting later). Implement exponential backoff for retries. Add dead letter queue for persistent failures. Consider rate limiting integration with Redis.
