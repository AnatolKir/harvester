# Setup Monitoring Alerts

## Objective

Implement health monitoring and Slack alerts to prevent future system degradation and enable proactive issue resolution.

## Context

- Sprint: 8
- Dependencies: prompt_05_validate_domain_extraction.md completed
- Related files: `/web/api/health/`, monitoring configuration, alert setup

## Task

The current system degradation went undetected for an unknown period. Implement comprehensive monitoring and alerting to catch issues early and maintain system reliability.

### Current Issues

1. **No Health Monitoring**
   - System failures go undetected
   - No visibility into component health
   - Issues discovered only during manual checks

2. **No Alerting System**
   - No notifications when jobs fail
   - No alerts for performance degradation
   - Team unaware of system problems

3. **No Performance Tracking**
   - Domain extraction rate not monitored
   - Test failure rates not tracked
   - No trending analysis for early warning

### Required Actions

1. **Health Check Endpoints**
   - Implement comprehensive health checks
   - Monitor database connectivity
   - Check worker endpoint availability
   - Track job execution status

2. **Alert Configuration**
   - Set up Slack webhook integration
   - Configure alert thresholds and schedules
   - Implement escalation procedures
   - Test alert delivery mechanisms

3. **Performance Monitoring**
   - Track domains extracted per hour/day
   - Monitor test pass rates continuously
   - Alert on deviation from targets
   - Dashboard for real-time status

4. **Proactive Monitoring**
   - Regular health check polling
   - Automated issue detection
   - Early warning system for degradation
   - Historical trend analysis

## Subagent to Use

Invoke the **monitoring-specialist** to:

- Design comprehensive health check system
- Configure Slack alerts with proper thresholds
- Implement performance tracking and dashboards
- Set up automated monitoring workflows

## Success Criteria

- [ ] Health check endpoints implemented and tested
- [ ] Slack alerts configured and working
- [ ] Performance metrics tracked automatically
- [ ] Alert thresholds set for critical issues
- [ ] Monitoring dashboard created
- [ ] Alert escalation procedures documented
- [ ] Historical data collection started
- [ ] Team notification system operational

## Implementation Steps

1. **Health Check API**
   ```typescript
   // /web/api/health/route.ts
   export async function GET() {
     const health = {
       timestamp: new Date().toISOString(),
       database: await checkDatabase(),
       worker: await checkWorker(),
       jobs: await checkJobs(),
       overall: 'healthy'
     };
     return Response.json(health);
   }
   ```

2. **Slack Integration**
   ```typescript
   async function sendSlackAlert(message: string, severity: 'info' | 'warning' | 'critical') {
     await fetch(process.env.SLACK_WEBHOOK_URL!, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
         text: `🚨 TikTok Harvester Alert: ${message}`,
         color: severity === 'critical' ? 'danger' : 'warning'
       })
     });
   }
   ```

3. **Performance Tracking**
   ```sql
   CREATE TABLE monitoring_metrics (
     id SERIAL PRIMARY KEY,
     metric_name VARCHAR(100) NOT NULL,
     metric_value DECIMAL(10,2) NOT NULL,
     recorded_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

4. **Alert Configuration**
   - Domains/hour < 5: Warning alert
   - Test pass rate < 90%: Warning alert
   - Job execution failure: Critical alert
   - Worker endpoint 404: Critical alert

## Monitoring Targets

### Critical Alerts (Immediate Response)
- Worker endpoints returning 404
- Database connection failures
- Job execution stopped for >30 minutes
- Zero domains extracted for >2 hours

### Warning Alerts (Next Business Day)
- Domain extraction rate below 50% of target
- Test pass rate below 90%
- Performance degradation >20%
- Memory/CPU usage above 80%

### Info Alerts (Weekly Summary)
- Weekly domain extraction summary
- System performance report
- Health check summary
- Upcoming maintenance reminders

## Health Check Components

1. **Database Health**
   - Connection test
   - Query performance check
   - Table accessibility validation

2. **Worker Health**
   - Endpoint availability
   - Response time monitoring
   - Error rate tracking

3. **Job Health**
   - Last execution timestamp
   - Success/failure rates
   - Queue depth monitoring

4. **System Health**
   - Memory usage
   - CPU utilization
   - Disk space availability

## Notes

- Use environment variables for sensitive webhook URLs
- Implement rate limiting for alerts to prevent spam
- Store historical metrics for trend analysis
- Consider external monitoring service for reliability

## Handoff Notes

After completion:
- Comprehensive monitoring operational
- Slack alerts configured and tested
- Ready for performance optimization in prompt_07