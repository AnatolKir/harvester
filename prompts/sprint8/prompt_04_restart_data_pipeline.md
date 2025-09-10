# Restart Data Pipeline

## Objective

Debug and restart Inngest job scheduling to restore the data discovery and harvesting pipeline.

## Context

- Sprint: 8
- Dependencies: prompt_03_deploy_worker_endpoints.md completed
- Related files: `/inngest/`, Inngest dashboard, job configuration

## Task

Inngest jobs show as "Registered" but are not executing, causing the complete stall of the data pipeline. The discovery cron job should trigger every 10 minutes but hasn't run successfully, resulting in only 27 domains captured this week instead of the 200-500 target.

### Current Issues

1. **Job Execution Failure**
   - Discovery cron job registered but not executing
   - No job runs in Inngest dashboard
   - Pipeline completely stalled for unknown duration

2. **Missing Error Visibility**
   - No error logs from failed job attempts
   - Unclear why jobs aren't triggering
   - No debugging information available

3. **Pipeline Impact**
   - Zero new video discoveries
   - No comment harvesting occurring
   - Domain extraction completely stopped

### Required Actions

1. **Job Status Audit**
   - Check Inngest dashboard for job history
   - Review job registration and configuration
   - Identify error patterns or failure modes

2. **Configuration Debugging**
   - Verify environment variables and API keys
   - Check job scheduling syntax and timing
   - Ensure webhook URLs are accessible

3. **Manual Execution Test**
   - Trigger discovery job manually
   - Monitor execution through completion
   - Verify data flows correctly to database

4. **Restart and Monitor**
   - Fix identified configuration issues
   - Restart job scheduling
   - Set up monitoring for future failures

## Subagent to Use

Invoke the **job-scheduler** to:

- Debug Inngest job configuration and execution
- Test job triggers and webhook connectivity
- Restart data pipeline with proper monitoring
- Implement error handling and retry logic

## Success Criteria

- [ ] Discovery job executes successfully on manual trigger
- [ ] Cron schedule restored to 10-minute intervals
- [ ] Job execution logs visible in Inngest dashboard
- [ ] New videos discovered and stored in database
- [ ] Comment harvesting jobs triggered automatically
- [ ] Error handling and retry logic implemented
- [ ] Monitoring alerts configured for job failures
- [ ] Data pipeline producing domains at target rate

## Implementation Steps

1. **Inngest Dashboard Audit**
   ```bash
   # Check job registration status
   npx inngest-cli dev
   # Review dashboard at dashboard.inngest.com
   ```

2. **Manual Job Trigger**
   ```bash
   # Test discovery job manually
   curl -X POST "https://api.inngest.com/v1/events" \
     -H "Authorization: Bearer $INNGEST_API_KEY" \
     -d '{"name": "discovery/trigger", "data": {}}'
   ```

3. **Configuration Validation**
   ```typescript
   // Verify job definition syntax
   const discoveryJob = inngest.createFunction(
     { name: "Discovery Job", id: "discovery-cron" },
     { cron: "*/10 * * * *" }, // Every 10 minutes
     async ({ event, step }) => {
       // Job implementation
     }
   );
   ```

4. **Pipeline Verification**
   - Check database for new video records
   - Verify comment harvesting triggers
   - Monitor domain extraction completion

## Debugging Checklist

- [ ] `INNGEST_API_KEY` environment variable set
- [ ] `WORKER_WEBHOOK_URL` accessible from Inngest
- [ ] Webhook endpoint responding to health checks  
- [ ] Job function syntax valid and error-free
- [ ] Cron schedule format correct
- [ ] Rate limiting not blocking job execution
- [ ] Database connections working in job context

## Error Recovery Procedures

1. **If jobs still don't execute:**
   - Redeploy Inngest configuration
   - Check webhook URL accessibility
   - Verify API key permissions

2. **If execution starts but fails:**
   - Add detailed logging to job functions
   - Implement step-by-step error handling
   - Set up retry logic with backoff

3. **If partial execution:**
   - Check worker endpoint availability
   - Verify data persistence at each step
   - Monitor rate limiting impacts

## Notes

- Jobs may take 5-10 minutes to reflect changes
- Check both development and production environments
- Verify timezone settings for cron schedules
- Monitor initial runs closely for issues

## Handoff Notes

After completion:
- Data pipeline executing on schedule
- Jobs visible in Inngest dashboard
- Ready for domain extraction validation in prompt_05