import { inngest } from '../client';
import { JobResult } from '../types';
import { createClient } from '@supabase/supabase-js';
import { MCPClient } from '../../src/lib/mcp/client';
import { acquireDiscoveryToken } from '../../src/lib/rate-limit/buckets';
import { fetchPromotedVideoIds } from '../../src/lib/mcp/discovery';
import { getGlobalMcpBreaker } from '../../src/lib/mcp/circuitBreaker';
import { alertJobError } from '../../src/lib/alerts';
import { generateCorrelationId } from '../utils';

function getServiceSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Supabase service credentials are not configured');
  }
  return createClient(url, key);
}

export const videoDiscoveryJob = inngest.createFunction(
  {
    id: 'video-discovery',
    name: 'TikTok Video Discovery',
    retries: 3,
    concurrency: {
      limit: 5,
    },
  },
  [
    { event: 'tiktok/video.discovery.scheduled' },
    { cron: '*/10 * * * *' }, // Every 10 minutes
  ],
  async ({ event, step, logger, attempt }) => {
    const supabase = getServiceSupabase();
    const correlationId = generateCorrelationId();
    const { videoId, forceRefresh = false, limit = 50 } = event.data;
    const jobId = `discovery-${Date.now()}`;

    logger.info('Starting video discovery job', {
      videoId,
      forceRefresh,
      limit,
      attempt,
      correlationId,
    });

    try {
      // Step 1: Check kill switch
      const killSwitchActive = await step.run('check-kill-switch', async () => {
        const { data: killSwitch } = await supabase
          .from('system_config')
          .select('value')
          .eq('key', 'kill_switch_active')
          .maybeSingle();

        return killSwitch?.value === true;
      });

      if (killSwitchActive) {
        logger.warn('Kill switch is active, aborting discovery job');
        return {
          success: false,
          error: 'Kill switch is active',
          metadata: { killSwitchTriggered: true },
        };
      }

      // Step 2: Update job status + log start
      await step.run('update-job-status', async () => {
        await inngest.send({
          name: 'tiktok/job.status.update',
          data: {
            jobId,
            status: 'running',
            metadata: { videoId, attempt, correlationId },
          },
        });

        await supabase.from('system_logs').insert({
          event_type: 'job_start',
          level: 'info',
          message: 'Video discovery started',
          job_id: jobId,
          metadata: { videoId, forceRefresh, limit, attempt, correlationId },
        });
      });

      // Step 3: Discover promoted videos via MCP (respect global rate limit)
      const discoveryResult = (await step.run('discover-videos', async () => {
        await acquireDiscoveryToken({ identifier: 'global', logger });
        const mcp = new MCPClient({
          baseUrl: process.env.MCP_BASE_URL!,
          apiKey: process.env.BRIGHTDATA_MCP_API_KEY!,
          stickyMinutes: parseInt(process.env.MCP_STICKY_SESSION_MINUTES || '10'),
        });

        // Retry with exponential backoff (jitter) for transient MCP errors
        const maxRetries = 5;
        let attemptNum = 0;
        let items: Array<{ video_id: string; url: string }> = [];
        // eslint-disable-next-line no-constant-condition
        while (true) {
          try {
            const breaker = getGlobalMcpBreaker();
            const allowed = await breaker.canProceed();
            if (!allowed) {
              logger.warn('circuit_open_fast_fail', { correlationId });
              throw new Error('MCP circuit open');
            }
            const res = await fetchPromotedVideoIds(mcp, {
              region: 'US',
              keywords: [
                'ad',
                'sponsored',
                'review',
                'promo',
                'coupon',
                'shop',
                'amazon',
                'skincare',
              ],
              limit,
              contentType: 'promoted',
            });
            items = res;
            await breaker.onSuccess();
            break;
          } catch (err: any) {
            const status = err?.status;
            const bodySnippet = err?.bodySnippet;
            const isTransient = err?.isTransient === true;
            try {
              await getGlobalMcpBreaker().onFailure();
            } catch {}
            logger.warn('mcp_discovery_failed', {
              status,
              isTransient,
              body: bodySnippet,
              attempt: attemptNum + 1,
              correlationId,
            });
            if (!isTransient || attemptNum >= maxRetries - 1) {
              // Fail fast on 4xx or when retries exhausted
              throw err;
            }
            const base = 500 * Math.pow(2, attemptNum); // 0.5s,1s,2s,4s,8s
            const jitter = Math.floor(Math.random() * 250);
            const waitMs = Math.min(10000, base + jitter);
            logger.info('backoff_wait', { waitMs, attempt: attemptNum + 1, correlationId });
            await new Promise((r) => setTimeout(r, waitMs));
            attemptNum++;
          }
        }

        // Insert videos with idempotency in-loop
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

        logger.info('Video discovery completed', {
          videosFound: items.length,
          newVideos,
          correlationId,
        });

        await supabase.from('system_logs').insert({
          event_type: 'job_progress',
          level: 'info',
          message: 'Video discovery completed step',
          job_id: jobId,
          metadata: { videosFound: items.length, newVideos, correlationId },
        });

        return {
          videosFound: items.length,
          newVideos,
          videoIds: items.map((i: { video_id: string }) => i.video_id),
        };
      })) as unknown as { videosFound: number; newVideos: number; videoIds: string[] };

      // Step 4: Trigger links enrichment for discovered videos (even if already known)
      await step.run('trigger-links-enrichment', async () => {
        const uniqueIds = Array.from(new Set(discoveryResult.videoIds || []));
        if (uniqueIds.length === 0) return;
        const enrichPromises = uniqueIds.map((videoId: string) =>
          inngest.send({
            name: 'tiktok/video.enrich.links',
            data: { videoId, includeProfile: true },
          })
        );
        await Promise.all(enrichPromises);
        logger.info('Triggered links enrichment jobs', {
          count: enrichPromises.length,
          correlationId,
        });
      });

      // Step 5: Trigger harvesting for new videos (unchanged)
      if (discoveryResult.newVideos > 0) {
        await step.run('trigger-harvesting', async () => {
          const harvestingPromises = discoveryResult.videoIds.map((videoId: string) =>
            inngest.send({
              name: 'tiktok/comment.harvest',
              data: {
                videoId,
                maxPages: 2, // MVP constraint: 1-2 pages per video
                delayBetweenPages: 1000,
              },
            })
          );

          await Promise.all(harvestingPromises);

          logger.info('Triggered harvesting jobs', {
            count: harvestingPromises.length,
            correlationId,
          });
        });
      }

      // Step 6: Update final job status + log completion
      await step.run('complete-job-status', async () => {
        await inngest.send({
          name: 'tiktok/job.status.update',
          data: {
            jobId,
            status: 'completed',
            metadata: {
              videosFound: discoveryResult.videosFound,
              newVideos: discoveryResult.newVideos,
              harvestingJobsTriggered: discoveryResult.newVideos,
            },
          },
        });

        await supabase.from('system_logs').insert({
          event_type: 'job_complete',
          level: 'info',
          message: 'Video discovery job completed',
          job_id: jobId,
          metadata: {
            videosFound: discoveryResult.videosFound,
            newVideos: discoveryResult.newVideos,
          },
        });
      });

      return {
        success: true,
        data: {
          videosFound: discoveryResult.videosFound,
          newVideos: discoveryResult.newVideos,
          harvestingJobsTriggered: discoveryResult.newVideos,
        },
        metadata: {
          executionTime: Date.now(),
          attempt,
        },
      } as JobResult;
    } catch (error) {
      logger.error('Video discovery job failed', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        attempt,
      });

      // Fire alert (deduplicated)
      await alertJobError(jobId, {
        error: error instanceof Error ? error.message : String(error),
        attempt,
      });

      await supabase.from('system_logs').insert({
        event_type: 'job_error',
        level: 'error',
        message: 'Video discovery job failed',
        job_id: jobId,
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          attempt,
          correlationId,
        },
      });

      // Update job status to failed
      await step.run('fail-job-status', async () => {
        await inngest.send({
          name: 'tiktok/job.status.update',
          data: {
            jobId: `discovery-${Date.now()}`,
            status: 'failed',
            metadata: {
              error: error instanceof Error ? error.message : String(error),
              attempt,
              willRetry: attempt < 3,
              correlationId,
            },
          },
        });
      });

      // If this is the final attempt, send to dead letter queue
      if (attempt >= 3) {
        await step.run('send-to-dead-letter-queue', async () => {
          await inngest.send({
            name: 'tiktok/system.retry',
            data: {
              originalEventName: 'tiktok/video.discovery.scheduled',
              originalPayload: event.data,
              attempt,
              lastError: error instanceof Error ? error.message : String(error),
            },
          });
        });
      }

      throw error;
    }
  }
);

// Manual discovery trigger (for admin use)
export const manualVideoDiscoveryJob = inngest.createFunction(
  {
    id: 'manual-video-discovery',
    name: 'Manual TikTok Video Discovery',
    retries: 1,
    concurrency: {
      limit: 2,
    },
  },
  { event: 'tiktok/video.discovery.manual' },
  async ({ event, logger, attempt }) => {
    const { videoId, forceRefresh = false, limit = 50 } = event.data;

    logger.info('Starting manual video discovery job', {
      videoId,
      forceRefresh,
      limit,
      attempt,
    });

    return {
      success: true,
      data: {
        message: 'Manual discovery triggered',
        videoId,
        forceRefresh,
        limit,
      },
    } as JobResult;
  }
);


