import { inngest } from '../client';
import { JobResult } from '../types';
import { createClient } from '@supabase/supabase-js';
import { MCPClient } from '../../src/lib/mcp/client';
import { acquireDiscoveryToken } from '../../src/lib/rate-limit/buckets';
import { fetchPromotedVideoIds } from '../../src/lib/mcp/discovery';
import { alertJobError } from '../../src/lib/alerts';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

type BackfillCheckpoint = {
  daysRemaining: number;
  offsetHours: number;
  lastRunAt?: string;
};

export const discoveryBackfillJob = inngest.createFunction(
  {
    id: 'video-discovery-backfill',
    name: 'TikTok Video Discovery Backfill',
    retries: 2,
    concurrency: { limit: 1 },
  },
  { event: 'tiktok/video.discovery.backfill' },
  async ({ event, step, logger, attempt }) => {
    const { days = 1, limit = 100 } = (event as any).data || {};
    const jobId = `discovery-backfill-${Date.now()}`;

    logger.info('Starting discovery backfill', { days, limit, attempt });

    try {
      // Kill switch
      const killSwitchActive = await step.run('check-kill-switch', async () => {
        const { data: killSwitch } = await supabase
          .from('system_config')
          .select('value')
          .eq('key', 'kill_switch_active')
          .maybeSingle();
        return killSwitch?.value === true;
      });
      if (killSwitchActive) {
        logger.warn('Kill switch active; aborting backfill');
        return {
          success: false,
          error: 'Kill switch active',
          metadata: { killSwitchTriggered: true },
        } as JobResult;
      }

      // Start status + log
      await step.run('start-job', async () => {
        await inngest.send({
          name: 'tiktok/job.status.update',
          data: { jobId, status: 'running', metadata: { days, limit, attempt } },
        });
        await supabase.from('system_logs').insert({
          event_type: 'job_start',
          level: 'info',
          message: 'Discovery backfill started',
          job_id: jobId,
          metadata: { days, limit, attempt },
        });
      });

      // Load or initialize checkpoint
      const checkpoint = await step.run('load-checkpoint', async () => {
        const key = 'discovery_backfill_checkpoint';
        const { data } = await supabase
          .from('system_config')
          .select('value')
          .eq('key', key)
          .maybeSingle();
        const existing = (data?.value as BackfillCheckpoint | undefined) || undefined;
        if (existing && typeof existing.daysRemaining === 'number') {
          return existing;
        }
        const fresh: BackfillCheckpoint = {
          daysRemaining: Math.max(0, days),
          offsetHours: 0,
          lastRunAt: new Date().toISOString(),
        };
        await supabase.from('system_config').upsert({ key, value: fresh }, { onConflict: 'key' });
        return fresh;
      });

      let totalFound = 0;
      let totalInserted = 0;
      let processedDays = 0;

      // Process day windows
      const mcp = new MCPClient({
        baseUrl: process.env.MCP_BASE_URL!,
        apiKey: process.env.BRIGHTDATA_MCP_API_KEY!,
        stickyMinutes: parseInt(process.env.MCP_STICKY_SESSION_MINUTES || '10'),
      });

      for (let i = 0; i < checkpoint.daysRemaining; i++) {
        // Global pacing token
        await step.run(`acquire-token-${i}`, async () => {
          await acquireDiscoveryToken({ identifier: 'global', logger });
        });

        const offsetHours = checkpoint.offsetHours + i * 24;
        const { found, inserted } = await step.run(`fetch-window-${i}`, async () => {
          const items = await fetchPromotedVideoIds(mcp, {
            region: 'US',
            windowHours: 24,
            pageSize: limit,
            offsetHours,
          });

          const seen = new Set<string>();
          let newVideos = 0;
          for (const v of items) {
            if (!v.video_id || seen.has(v.video_id)) continue;
            seen.add(v.video_id);
            const { error } = await supabase.from('video').upsert(
              {
                video_id: v.video_id,
                url: v.url,
                is_promoted: true,
              },
              { onConflict: 'video_id' }
            );
            if (!error) newVideos++;
          }

          await supabase.from('system_logs').insert({
            event_type: 'job_progress',
            level: 'info',
            message: 'Backfill window processed',
            job_id: jobId,
            metadata: { offsetHours, windowHours: 24, videosFound: items.length, newVideos },
          });

          return { found: items.length, inserted: newVideos };
        });

        totalFound += found;
        totalInserted += inserted;
        processedDays++;

        // Persist checkpoint after each window
        await step.run(`persist-checkpoint-${i}`, async () => {
          const key = 'discovery_backfill_checkpoint';
          const next: BackfillCheckpoint = {
            daysRemaining: Math.max(0, checkpoint.daysRemaining - (i + 1)),
            offsetHours: checkpoint.offsetHours + (i + 1) * 24,
            lastRunAt: new Date().toISOString(),
          };
          await supabase.from('system_config').upsert({ key, value: next }, { onConflict: 'key' });
        });

        // Short jitter between windows to avoid bursts even with tokens
        const jitter = 150 + Math.floor(Math.random() * 300);
        await new Promise((r) => setTimeout(r, jitter));
      }

      // Finalize
      await step.run('complete', async () => {
        await inngest.send({
          name: 'tiktok/job.status.update',
          data: {
            jobId,
            status: 'completed',
            metadata: { daysRequested: days, processedDays, totalFound, totalInserted },
          },
        });

        await supabase.from('system_logs').insert({
          event_type: 'job_complete',
          level: 'info',
          message: 'Discovery backfill completed',
          job_id: jobId,
          metadata: { daysRequested: days, processedDays, totalFound, totalInserted },
        });
      });

      return {
        success: true,
        data: {
          daysRequested: days,
          processedDays,
          videosFound: totalFound,
          newVideos: totalInserted,
        },
        metadata: { attempt },
      } as JobResult;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Backfill failed', { error: message, attempt });

      await alertJobError(jobId, { error: message, attempt });
      await supabase.from('system_logs').insert({
        event_type: 'job_error',
        level: 'error',
        message: 'Discovery backfill failed',
        job_id: jobId,
        metadata: { error: message, attempt },
      });

      await step.run('fail-status', async () => {
        await inngest.send({
          name: 'tiktok/job.status.update',
          data: {
            jobId,
            status: 'failed',
            metadata: { error: message, attempt },
          },
        });
      });

      throw error;
    }
  }
);


