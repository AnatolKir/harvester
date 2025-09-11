import { inngest } from '../client';
import { JobResult } from '../types';
import { createClient } from '@supabase/supabase-js';

function getServiceSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Supabase service credentials are not configured');
  }
  return createClient(url, key);
}

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
const SLACK_ALERTS_ENABLED = process.env.SLACK_ALERTS_ENABLED === 'true';

async function postToSlack(title: string, message: string, details?: Record<string, unknown>) {
  if (!SLACK_ALERTS_ENABLED || !SLACK_WEBHOOK_URL) return;
  try {
    const blocks: any[] = [
      { type: 'header', text: { type: 'plain_text', text: title } },
      { type: 'section', text: { type: 'mrkdwn', text: message } },
    ];
    if (details) {
      blocks.push({
        type: 'section',
        text: { type: 'mrkdwn', text: '```' + JSON.stringify(details, null, 2).slice(0, 3000) + '```' },
      });
    }
    await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: `${title}: ${message}`, blocks }),
    });
  } catch {}
}

export const killSwitchJob = inngest.createFunction(
  { id: 'system-kill-switch', name: 'System Kill Switch', retries: 0 },
  { event: 'tiktok/system.kill_switch' },
  async ({ event, step, logger }) => {
    const supabase = getServiceSupabase();
    const { reason, requestedBy, timestamp } = event.data;
    logger.warn('Kill switch activated', { reason, requestedBy, timestamp });
    await step.run('activate-kill-switch', async () => {
      const { data: existingConfig } = await supabase
        .from('system_config')
        .select('key')
        .eq('key', 'kill_switch_active')
        .maybeSingle();
      if (!existingConfig) {
        await supabase.from('system_config').insert({
          key: 'kill_switch_active',
          value: true,
          description: 'Emergency kill switch for all jobs',
        });
      } else {
        await supabase
          .from('system_config')
          .update({ value: true, updated_at: new Date().toISOString() })
          .eq('key', 'kill_switch_active');
      }
    });
    await step.run('log-kill-switch', async () => {
      await supabase.from('system_logs').insert({
        event_type: 'kill_switch_activated',
        message: `Kill switch activated: ${reason || 'No reason provided'}`,
        metadata: { requestedBy, timestamp, reason },
      });
    });
    await step.run('notify-slack-kill-switch', async () => {
      await postToSlack('Kill Switch Activated', reason ? `Reason: ${reason}` : 'No reason provided', {
        requestedBy,
        timestamp,
      });
    });
    return { success: true, data: { killSwitchActivated: true } } as JobResult;
  }
);

export const deactivateKillSwitchJob = inngest.createFunction(
  { id: 'system-deactivate-kill-switch', name: 'Deactivate System Kill Switch', retries: 0 },
  { event: 'tiktok/system.deactivate_kill_switch' },
  async ({ event, step, logger }) => {
    const supabase = getServiceSupabase();
    const { reason, requestedBy } = event.data;
    logger.info('Deactivating kill switch', { reason, requestedBy });
    await step.run('deactivate-kill-switch', async () => {
      await supabase
        .from('system_config')
        .update({ value: false, updated_at: new Date().toISOString() })
        .eq('key', 'kill_switch_active');
      await supabase.from('system_logs').insert({
        event_type: 'kill_switch_deactivated',
        message: `Kill switch deactivated: ${reason || 'No reason provided'}`,
        metadata: { requestedBy, reason },
      });
    });
    await step.run('notify-slack-kill-switch-off', async () => {
      await postToSlack('Kill Switch Deactivated', reason ? `Reason: ${reason}` : 'No reason provided', {
        requestedBy,
      });
    });
    return { success: true, data: { killSwitchDeactivated: true } } as JobResult;
  }
);

export const healthCheckJob = inngest.createFunction(
  { id: 'system-health-check', name: 'System Health Check', retries: 1 },
  [{ event: 'tiktok/system.health_check' }, { cron: '*/5 * * * *' }],
  async ({ step, logger }) => {
    const supabase = getServiceSupabase();
    logger.info('Starting system health check');
    const healthData = await step.run('collect-health-metrics', async () => {
      const { data: killSwitchConfig } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'kill_switch_active')
        .maybeSingle();
      const killSwitchActive = killSwitchConfig?.value === true;
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: recentJobs } = await supabase
        .from('job_status')
        .select('status, created_at')
        .gte('created_at', oneDayAgo);
      const { data: recentDiscovery } = await supabase
        .from('video')
        .select('discovered_at')
        .gte('discovered_at', oneDayAgo)
        .order('discovered_at', { ascending: false })
        .limit(1);
      const { data: recentHarvest } = await supabase
        .from('comment')
        .select('discovered_at')
        .gte('discovered_at', oneDayAgo)
        .order('discovered_at', { ascending: false })
        .limit(1);
      const totalJobs = recentJobs?.length || 0;
      const completedJobs = recentJobs?.filter((j) => j.status === 'completed').length || 0;
      const failedJobs = recentJobs?.filter((j) => j.status === 'failed').length || 0;
      const runningJobs = recentJobs?.filter((j) => j.status === 'running').length || 0;
      const lastSuccessfulDiscovery = recentDiscovery?.[0]?.discovered_at
        ? new Date(recentDiscovery[0].discovered_at)
        : undefined;
      const lastSuccessfulHarvest = recentHarvest?.[0]?.discovered_at
        ? new Date(recentHarvest[0].discovered_at)
        : undefined;
      return {
        killSwitchActive,
        discoveryJobsRunning: runningJobs,
        harvestingJobsRunning: runningJobs,
        deadLetterQueueSize: failedJobs,
        lastSuccessfulDiscovery,
        lastSuccessfulHarvest,
        totalJobs,
        completedJobs,
        failedJobs,
        successRate: totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0,
      };
    });
    await step.run('log-health-check', async () => {
      await supabase.from('system_logs').insert({
        event_type: 'health_check',
        message: `System health check completed.`,
        metadata: { ...healthData, timestamp: new Date().toISOString() },
      });
    });
    return { success: true, data: { health: healthData } } as JobResult;
  }
);

export const deadLetterQueueJob = inngest.createFunction(
  { id: 'system-dead-letter-queue', name: 'Dead Letter Queue Processor', retries: 1 },
  { event: 'tiktok/system.retry' },
  async ({ event, step, logger }) => {
    const supabase = getServiceSupabase();
    const { originalEventName, originalPayload, attempt, lastError } = event.data as any;
    logger.warn('Processing dead letter queue item', { originalEventName, attempt, lastError });
    await step.run('log-failed-job', async () => {
      await supabase.from('dead_letter_queue').insert({
        original_event_name: originalEventName,
        original_payload: originalPayload,
        attempt_count: attempt,
        last_error: lastError,
        created_at: new Date().toISOString(),
        status: 'pending',
      });
    });
    return { success: true, data: { logged: true } } as JobResult;
  }
);

export const jobStatusJob = inngest.createFunction(
  { id: 'system-job-status', name: 'Job Status Tracking', retries: 1 },
  { event: 'tiktok/job.status.update' },
  async ({ event, step }) => {
    const supabase = getServiceSupabase();
    const { jobId, status, metadata, jobType, startedAt, completedAt, executionTimeMs } = event.data as any;
    await step.run('update-job-status', async () => {
      const payload: any = { job_id: jobId, status, metadata, updated_at: new Date().toISOString() };
      if (jobType) payload.job_type = jobType;
      if (startedAt) payload.started_at = new Date(startedAt).toISOString();
      if (completedAt) payload.completed_at = new Date(completedAt).toISOString();
      if (typeof executionTimeMs === 'number') payload.execution_time_ms = Math.max(0, Math.floor(executionTimeMs));
      await supabase.from('job_status').upsert(payload, { onConflict: 'job_id' });
    });
    return { success: true, data: { jobId, status, updated: true } } as JobResult;
  }
);

export const maintenanceCleanupJob = inngest.createFunction(
  { id: 'maintenance-cleanup', name: 'Maintenance Data Cleanup', retries: 1 },
  [{ event: 'tiktok/maintenance.cleanup' }, { cron: '0 2 * * 0' }],
  async ({ event, step }) => {
    const supabase = getServiceSupabase();
    const { daysToKeep = 90 } = event.data as any;
    await step.run('cleanup-old-data', async () => {
      await supabase.rpc('cleanup_old_data', { days_to_keep: daysToKeep });
    });
    await step.run('cleanup-system-tables', async () => {
      const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
      await supabase.from('job_status').delete().lt('created_at', cutoffDate.toISOString());
      await supabase.from('system_logs').delete().lt('created_at', cutoffDate.toISOString());
    });
    return { success: true, data: { cleanupDate: new Date().toISOString() } } as JobResult;
  }
);

// Watchdog: mark long-running discovery jobs as failed and send to DLQ
export const watchdogStuckDiscoveryJobs = inngest.createFunction(
  { id: 'watchdog-stuck-discovery', name: 'Watchdog · Discovery timeouts', retries: 0 },
  { cron: '*/1 * * * *' },
  async ({ step, logger }) => {
    const supabase = getServiceSupabase();
    const thresholdMinutes = 3;
    const result = await step.run('find-stuck', async () => {
      const { data, error } = await supabase
        .from('job_status')
        .select('job_id, started_at, created_at, job_type, status')
        .eq('status', 'running');
      if (error) throw error;
      const now = Date.now();
      const stuck = (data || []).filter((r: any) => {
        const started = r.started_at
          ? new Date(r.started_at).getTime()
          : r.created_at
          ? new Date(r.created_at).getTime()
          : now;
        return now - started > thresholdMinutes * 60 * 1000;
      });
      return stuck as Array<{ job_id: string; started_at: string | null; created_at?: string | null }>;
    });

    if (result.length === 0) return { success: true };

    await step.run('mark-failed', async () => {
      for (const row of result) {
        try {
          await supabase
            .from('job_status')
            .update({ status: 'failed', completed_at: new Date().toISOString(), error_message: 'watchdog timeout >10m' })
            .eq('job_id', row.job_id);

          await supabase.from('system_logs').insert({
            event_type: 'job_error',
            level: 'error',
            message: 'Watchdog marked discovery job failed (timeout)',
            job_id: row.job_id,
            metadata: { thresholdMinutes },
          });

          // Put into DLQ for optional manual retry
          await inngest.send({
            name: 'tiktok/system.retry',
            data: {
              originalEventName: 'tiktok/video.discovery.scheduled',
              originalPayload: { reason: 'watchdog_timeout' },
              attempt: 0,
              lastError: 'watchdog timeout >10m',
            },
          });
        } catch (e) {
          logger.error('watchdog_failed_to_mark', { jobId: row.job_id, error: (e as Error).message });
        }
      }
    });

    return { success: true };
  }
);


