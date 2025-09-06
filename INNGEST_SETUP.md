# Inngest Job Scheduling System Setup

This document provides comprehensive instructions for setting up and using the Inngest job scheduling system in the TikTok Domain Harvester project.

## Overview

The Inngest system provides:
- **Scheduled Discovery**: TikTok video discovery every 10 minutes
- **Comment Harvesting**: Automated comment extraction with domain parsing
- **System Monitoring**: Health checks, job tracking, and alerting
- **Kill Switch**: Emergency stop mechanism for all jobs
- **Dead Letter Queue**: Failed job recovery and retry system
- **Admin Interface**: REST API for job management

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Inngest       │    │   Next.js       │    │   Supabase      │
│   (Scheduler)   │◄──►│   (Webhook)     │◄──►│   (Database)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Cron Jobs     │    │   Job Functions │    │   System Tables │
│   - Discovery   │    │   - Processing  │    │   - job_status  │
│   - Health      │    │   - Monitoring  │    │   - system_logs │
│   - Cleanup     │    │   - Kill Switch │    │   - config      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Directory Structure

```
/inngest/                    # Inngest configuration and jobs
├── client.ts               # Inngest client configuration
├── types.ts                # TypeScript types for events
├── index.ts                # Main exports and helper functions
└── jobs/                   # Job function definitions
    ├── index.ts            # Job exports
    ├── discovery.ts        # Video discovery jobs
    ├── harvesting.ts       # Comment harvesting jobs
    └── system.ts           # System jobs (monitoring, kill switch)

/web/src/app/api/inngest/   # Next.js webhook endpoint
└── route.ts                # Webhook handler

/web/src/app/api/admin/     # Admin API endpoints
├── jobs/route.ts           # Job management
├── kill-switch/route.ts    # Emergency controls
├── config/route.ts         # System configuration
└── dead-letter-queue/      # Failed job management
    └── route.ts

/web/src/lib/
└── inngest-admin.ts        # Admin utility functions
```

## Installation & Setup

### 1. Install Dependencies

```bash
cd web
npm install inngest
```

### 2. Database Migration

Apply the system tables migration:

```bash
# Copy the contents of supabase/migrations/20250906000003_system_tables.sql
# Paste into Supabase SQL Editor and execute
```

This creates:
- `system_config` - Kill switch and configuration
- `job_status` - Job execution tracking
- `system_logs` - System event logging
- `dead_letter_queue` - Failed job recovery

### 3. Environment Variables

Update your `.env` file:

```bash
# Inngest Configuration
INNGEST_EVENT_KEY=your_inngest_event_key
INNGEST_SIGNING_KEY=your_inngest_signing_key
INNGEST_SERVE_HOST=http://localhost:3032
WORKER_API_KEY=development

# Job Configuration
MAX_CONCURRENT_DISCOVERY_JOBS=5
MAX_CONCURRENT_HARVESTING_JOBS=10
DISCOVERY_JOB_TIMEOUT_MINUTES=30
HARVESTING_JOB_TIMEOUT_MINUTES=60
```

### 4. Inngest Cloud Setup

1. Sign up at [inngest.com](https://inngest.com)
2. Create a new app: "TikTok Domain Harvester"
3. Get your Event Key and Signing Key
4. Configure webhook endpoint: `https://yourdomain.com/api/inngest`

## Job Types

### Discovery Jobs

**Scheduled Discovery** (`tiktok/video.discovery.scheduled`)
- **Schedule**: Every 10 minutes
- **Purpose**: Find new promoted TikTok videos
- **Retry Policy**: 3 attempts with exponential backoff
- **Concurrency**: Maximum 5 concurrent jobs

**Manual Discovery** (`tiktok/video.discovery.manual`)
- **Trigger**: Admin API or direct event
- **Purpose**: On-demand video discovery
- **Parameters**: `videoId`, `forceRefresh`, `limit`

### Harvesting Jobs

**Comment Harvesting** (`tiktok/comment.harvest`)
- **Trigger**: Automatically after video discovery
- **Purpose**: Extract comments from TikTok videos
- **Constraints**: Maximum 2 pages per video (MVP)
- **Retry Policy**: 3 attempts with exponential backoff

**Domain Extraction** (`tiktok/domain.extract`)
- **Trigger**: Automatically after comment harvesting
- **Purpose**: Parse domains from comment text
- **Method**: Regex-based extraction
- **Concurrency**: High (50 concurrent jobs)

### System Jobs

**Health Check** (`tiktok/system.health_check`)
- **Schedule**: Every 5 minutes
- **Purpose**: Monitor system health and alert on issues
- **Checks**: Job success rates, last successful runs, DLQ size

**Kill Switch** (`tiktok/system.kill_switch`)
- **Trigger**: Manual (emergency use only)
- **Purpose**: Stop all job execution immediately
- **Scope**: Affects all running and scheduled jobs

**Maintenance Cleanup** (`tiktok/maintenance.cleanup`)
- **Schedule**: Weekly (Sundays at 2 AM)
- **Purpose**: Clean up old data and logs
- **Default**: Keep 90 days of data

## Admin API Endpoints

### Job Management

```bash
# Get job status and metrics
GET /api/admin/jobs?type=discovery&hours=24

# Trigger jobs manually
POST /api/admin/jobs
{
  "action": "trigger_discovery",
  "limit": 50,
  "forceRefresh": false
}

POST /api/admin/jobs
{
  "action": "trigger_harvesting",
  "videoId": "video-uuid",
  "maxPages": 2
}
```

### Kill Switch

```bash
# Check kill switch status
GET /api/admin/kill-switch

# Activate kill switch (EMERGENCY)
POST /api/admin/kill-switch
{
  "reason": "High error rate detected",
  "requestedBy": "admin@company.com"
}

# Deactivate kill switch
DELETE /api/admin/kill-switch
{
  "reason": "Issue resolved",
  "requestedBy": "admin@company.com"
}
```

### System Configuration

```bash
# Get all configuration
GET /api/admin/config

# Update configuration
POST /api/admin/config
{
  "key": "max_concurrent_discovery_jobs",
  "value": 10,
  "description": "Increase discovery throughput"
}
```

### Dead Letter Queue

```bash
# Get failed jobs
GET /api/admin/dead-letter-queue?status=pending

# Retry a failed job
POST /api/admin/dead-letter-queue/retry
{
  "dlqId": "uuid-of-failed-job"
}
```

## Monitoring & Alerting

### System Health Metrics

The system tracks:
- **Job Success Rates**: Percentage of successful completions
- **Execution Times**: Average and p95 job duration
- **Queue Depths**: Pending and running job counts
- **Error Rates**: Failed jobs and error types
- **Last Successful Runs**: Time since last successful discovery/harvest

### Alert Conditions

Alerts trigger when:
- Kill switch is active
- No successful discovery in 30+ minutes
- No successful harvesting in 60+ minutes
- Job success rate below 70%
- Dead letter queue has 10+ items

### Accessing Metrics

```javascript
import { InngestAdmin } from '@/lib/inngest-admin';

// Get current system health
const health = await InngestAdmin.getSystemHealth();

// Get job metrics for last 24 hours
const metrics = await InngestAdmin.getJobMetrics('discovery', 24);

// Get recent system logs
const logs = await InngestAdmin.getRecentLogs(50);
```

## Development & Testing

### Local Development

1. Start the Next.js development server:
```bash
cd web
npm run dev
```

2. The Inngest webhook will be available at:
```
http://localhost:3032/api/inngest
```

3. Use Inngest Dev Server for local testing:
```bash
npx inngest-dev
```

### Manual Job Triggers

```javascript
import { triggerVideoDiscovery, activateKillSwitch } from '../inngest';

// Trigger discovery job
await triggerVideoDiscovery({
  limit: 10,
  forceRefresh: true
});

// Activate kill switch
await activateKillSwitch({
  reason: "Testing emergency stop",
  requestedBy: "developer@company.com"
});
```

### Testing Job Functions

Create test events:

```javascript
import { inngest } from '../inngest';

// Test discovery job
await inngest.send({
  name: "tiktok/video.discovery.manual",
  data: { limit: 5, forceRefresh: true }
});

// Test health check
await inngest.send({
  name: "tiktok/system.health_check",
  data: {}
});
```

## Production Deployment

### Environment Setup

1. **Inngest Cloud**: Configure production webhook URL
2. **Environment Variables**: Set production values for all required vars
3. **Database**: Ensure system tables are migrated
4. **Worker Integration**: Configure WORKER_WEBHOOK_URL

### Monitoring

1. **Inngest Dashboard**: Monitor job executions and failures
2. **System Health API**: Set up external monitoring
3. **Database Queries**: Monitor system_logs table
4. **Alerts**: Configure notifications for kill switch activation

### Security

- **Signing Key**: Use production INNGEST_SIGNING_KEY
- **API Authentication**: Secure admin endpoints
- **Rate Limiting**: Configure appropriate limits
- **Worker Authentication**: Use secure WORKER_API_KEY

## Troubleshooting

### Common Issues

1. **Jobs Not Executing**
   - Check kill switch status
   - Verify Inngest webhook endpoint
   - Check environment variables

2. **High Failure Rates**
   - Review system_logs for error patterns
   - Check worker service availability
   - Verify database connectivity

3. **Performance Issues**
   - Monitor concurrency limits
   - Check job execution times
   - Review database query performance

### Debug Commands

```bash
# Check system health
curl http://localhost:3032/api/admin/jobs

# Check kill switch status
curl http://localhost:3032/api/admin/kill-switch

# View recent logs
curl http://localhost:3032/api/admin/jobs | jq '.data.recentLogs'
```

### Emergency Procedures

**If jobs are causing system issues:**

1. Activate kill switch immediately:
```bash
curl -X POST http://localhost:3032/api/admin/kill-switch \
  -H "Content-Type: application/json" \
  -d '{"reason":"System overload","requestedBy":"ops@company.com"}'
```

2. Check system logs for error patterns
3. Resolve underlying issues
4. Deactivate kill switch when ready

## Cost Considerations

- **Inngest**: Free tier covers development, paid tiers for production scale
- **Database**: Additional tables and queries increase Supabase usage
- **API Calls**: Worker integration generates HTTP requests
- **Storage**: Job logs and status data accumulate over time

Regular maintenance cleanup helps control costs by removing old data.

## Future Enhancements

- **Advanced Retry Policies**: Exponential backoff with jitter
- **Job Priorities**: Critical vs. normal job queues  
- **Batch Processing**: Multiple videos per job
- **Real-time Dashboard**: WebSocket-based monitoring
- **Slack Integration**: Alert notifications
- **Job Scheduling**: Custom cron expressions
- **Performance Metrics**: Detailed execution analytics