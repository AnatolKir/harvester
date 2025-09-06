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

## Subagents to Use

1. Invoke the **inngest-specialist** agent (.claude/agents/inngest-specialist.md) to:
   - Initialize Inngest client in /inngest/
   - Create job definitions for discovery and harvesting
   - Set up cron schedules and retry policies
   - Implement webhook handler in Next.js

2. Then invoke the **queue-manager** agent (.claude/agents/queue-manager.md) to:
   - Add job status tracking
   - Implement dead letter queue
   - Create priority queuing logic
   - Set up job dependencies

3. Finally invoke the **performance-monitor** agent (.claude/agents/performance-monitor.md) to:
   - Create emergency stop functionality
   - Add job performance metrics
   - Set up monitoring and alerting

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
