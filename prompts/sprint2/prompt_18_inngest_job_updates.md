# Prompt 18: Inngest Job Updates

Goal
- Use MCP from Inngest jobs; remove legacy worker HTTP calls.

Steps
1) Discovery job (`inngest/jobs/discovery.ts`)
   - Replace WORKER_WEBHOOK_URL POST with MCP client calls.
   - Upsert `video` with `onConflict: video_id`. Count `newVideos`.
   - Emit `tiktok/comment.harvest` events for new IDs.
2) Harvest job (`inngest/jobs/harvesting.ts`)
   - Replace WORKER_WEBHOOK_URL POST with MCP client comments wrapper.
   - Upsert comments and update `video.last_scraped_at`.
   - Trigger `tiktok/domain.extract` events.
3) Extraction job (existing)
   - Ensure it writes `domain_mention(domain, video_id, comment_id, created_at)` uniquely (constraint).

Definition of Done
- No references to WORKER_* endpoints remain.
- Jobs succeed locally against MCP gateway; logs include counts and attempts.
- Failures retry gracefully (existing Inngest retries) with clear error messages.
