import { inngest } from './client';
import { 
  checkSystemHealth, 
  checkDomainExtractionRate, 
  checkJobExecution,
  checkWorkerHealth,
  sendWeeklySummary
} from '@/lib/monitoring/alerts';

// Run health checks every 5 minutes
export const healthCheck = inngest.createFunction(
  {
    id: 'health-check',
    name: 'System Health Check',
  },
  {
    cron: '*/5 * * * *', // Every 5 minutes
  },
  async ({ event, step }) => {
    console.log('Running system health check...');
    
    await step.run('check-system-health', async () => {
      await checkSystemHealth();
    });

    await step.run('check-worker-health', async () => {
      await checkWorkerHealth();
    });

    return { success: true, timestamp: new Date().toISOString() };
  }
);

// Check domain extraction rate every 30 minutes
export const domainExtractionCheck = inngest.createFunction(
  {
    id: 'domain-extraction-check',
    name: 'Domain Extraction Rate Check',
  },
  {
    cron: '*/30 * * * *', // Every 30 minutes
  },
  async ({ event, step }) => {
    console.log('Checking domain extraction rate...');
    
    await step.run('check-domain-rate', async () => {
      await checkDomainExtractionRate();
    });

    await step.run('check-job-execution', async () => {
      await checkJobExecution();
    });

    return { success: true, timestamp: new Date().toISOString() };
  }
);

// Send weekly summary every Monday at 9 AM
export const weeklySummary = inngest.createFunction(
  {
    id: 'weekly-summary',
    name: 'Weekly Summary Report',
  },
  {
    cron: '0 9 * * 1', // Every Monday at 9 AM
  },
  async ({ event, step }) => {
    console.log('Generating weekly summary...');
    
    await step.run('send-weekly-summary', async () => {
      await sendWeeklySummary();
    });

    return { success: true, timestamp: new Date().toISOString() };
  }
);

// Critical monitoring - check every 2 minutes for stopped extraction
export const criticalMonitoring = inngest.createFunction(
  {
    id: 'critical-monitoring',
    name: 'Critical System Monitoring',
  },
  {
    cron: '*/2 * * * *', // Every 2 minutes
  },
  async ({ event, step }) => {
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const supabase = createAdminClient();
    
    // Check if domain extraction has stopped
    await step.run('check-extraction-stopped', async () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      
      const { count } = await supabase
        .from('domain')
        .select('*', { count: 'exact', head: true })
        .gte('first_seen_at', twoHoursAgo);

      if (count === 0) {
        // Critical: No domains in 2 hours
        const { sendSlackAlert } = await import('@/lib/monitoring/alerts');
        await sendSlackAlert({
          severity: 'critical',
          title: '🚨 CRITICAL: Domain Extraction Stopped',
          message: 'No domains have been extracted in the last 2 hours. Immediate attention required.',
          details: {
            lastCheck: new Date().toISOString(),
            threshold: '2 hours',
            action: 'Check worker health and job execution immediately',
          },
        });
      }
    });

    // Check for high failure rates
    await step.run('check-failure-rates', async () => {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      
      const { data: jobs } = await supabase
        .from('job_execution')
        .select('status')
        .gte('executed_at', thirtyMinutesAgo);

      if (jobs && jobs.length > 0) {
        const failureRate = jobs.filter(j => j.status === 'failed').length / jobs.length;
        
        if (failureRate > 0.75) {
          const { sendSlackAlert } = await import('@/lib/monitoring/alerts');
          await sendSlackAlert({
            severity: 'critical',
            title: '🚨 CRITICAL: High Job Failure Rate',
            message: `${(failureRate * 100).toFixed(0)}% of jobs are failing`,
            details: {
              totalJobs: jobs.length,
              failedJobs: jobs.filter(j => j.status === 'failed').length,
              threshold: '75%',
              action: 'Check logs and worker status immediately',
            },
          });
        }
      }
    });

    return { success: true, timestamp: new Date().toISOString() };
  }
);