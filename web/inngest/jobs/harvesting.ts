import { inngest } from '../client';
import { JobResult } from '../types';
import { createClient } from '@supabase/supabase-js';
import { MCPClient } from '../../src/lib/mcp/client';
import { acquireCommentsToken } from '../../src/lib/rate-limit/buckets';
import { fetchCommentsForVideo } from '../../src/lib/mcp/comments';
import { getGlobalMcpBreaker } from '../../src/lib/mcp/circuitBreaker';
import { alertJobError } from '../../src/lib/alerts';
import { extractDomains, dedupeNormalized } from '../../src/lib/extract/domain';
import { generateCorrelationId } from '../utils';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export const commentHarvestingJob = inngest.createFunction(
  {
    id: 'comment-harvesting',
    name: 'TikTok Comment Harvesting',
    retries: 3,
    concurrency: {
      limit: 10,
    },
  },
  { event: 'tiktok/comment.harvest' },
  async ({ event, step, logger, attempt }) => {
    const correlationId = generateCorrelationId();
    const { videoId, maxPages = 2, delayBetweenPages = 1000 } = event.data;
    const jobId = `harvesting-${videoId}-${Date.now()}`;

    logger.info('Starting comment harvesting job', {
      videoId,
      maxPages,
      delayBetweenPages,
      attempt,
      correlationId,
    });

    try {
      const killSwitchActive = await step.run('check-kill-switch', async () => {
        const { data: killSwitch } = await supabase
          .from('system_config')
          .select('value')
          .eq('key', 'kill_switch_active')
          .maybeSingle();

        return killSwitch?.value === true;
      });

      if (killSwitchActive) {
        logger.warn('Kill switch is active, aborting harvesting job');
        return {
          success: false,
          error: 'Kill switch is active',
          metadata: { killSwitchTriggered: true },
        };
      }

      await step.run('update-job-status', async () => {
        await inngest.send({
          name: 'tiktok/job.status.update',
          data: {
            jobId,
            status: 'running',
            metadata: { videoId, attempt, maxPages, correlationId },
          },
        });

        await supabase.from('system_logs').insert({
          event_type: 'job_start',
          level: 'info',
          message: 'Comment harvesting started',
          job_id: jobId,
          metadata: { videoId, maxPages, attempt, correlationId },
        });
      });

      await step.run('rate-limit-check', async () => {
        await acquireCommentsToken({ identifier: 'global', logger });
      });

      const harvestResult = await step.run('harvest-comments', async () => {
        const mcp = new MCPClient({
          baseUrl: process.env.MCP_BASE_URL!,
          apiKey: process.env.BRIGHTDATA_MCP_API_KEY!,
          stickyMinutes: parseInt(process.env.MCP_STICKY_SESSION_MINUTES || '10'),
        });
        const maxRetries = 5;
        let attemptNum = 0;
        let comments: any[] = [];
        while (true) {
          try {
            const breaker = getGlobalMcpBreaker();
            const allowed = await breaker.canProceed();
            if (!allowed) {
              logger.warn('circuit_open_fast_fail', { correlationId });
              throw new Error('MCP circuit open');
            }
            const res = await fetchCommentsForVideo(mcp, videoId, { maxPages });
            comments = res;
            await breaker.onSuccess();
            break;
          } catch (err: any) {
            const status = err?.status;
            const bodySnippet = err?.bodySnippet;
            const isTransient = err?.isTransient === true;
            try {
              await getGlobalMcpBreaker().onFailure();
            } catch {}
            logger.warn('mcp_comments_failed', {
              status,
              isTransient,
              body: bodySnippet,
              attempt: attemptNum + 1,
              videoId,
              correlationId,
            });
            if (!isTransient || attemptNum >= maxRetries - 1) {
              throw err;
            }
            const base = 500 * Math.pow(2, attemptNum);
            const jitter = Math.floor(Math.random() * 250);
            const waitMs = Math.min(10000, base + jitter);
            logger.info('backoff_wait', {
              waitMs,
              attempt: attemptNum + 1,
              videoId,
              correlationId,
            });
            await new Promise((r) => setTimeout(r, waitMs));
            attemptNum++;
          }
        }

        let _inserted = 0;
        const seen = new Set<string>();
        for (const c of comments) {
          if (!c.comment_id || seen.has(c.comment_id)) continue;
          seen.add(c.comment_id);
          const { error } = await supabase.from('comment').upsert(
            {
              id: c.comment_id,
              video_id: videoId,
              comment_id: c.comment_id,
              content: c.text,
              author_username: c.user_id,
              posted_at: c.created_at,
            },
            { onConflict: 'id' }
          );
          if (!error) _inserted++;
        }

        return {
          commentsHarvested: comments.length,
          pagesProcessed: maxPages,
          domainsExtracted: 0,
          newComments: comments,
        };
      });

      await step.run('update-video-crawled', async () => {
        const { error } = await supabase
          .from('video')
          .update({
            last_scraped_at: new Date().toISOString(),
            comment_count: harvestResult.commentsHarvested,
          })
          .eq('id', videoId);

        if (error) {
          logger.warn('Failed to update video last_crawled_at', {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      });

      if (harvestResult.newComments && harvestResult.newComments.length > 0) {
        await step.run('trigger-domain-extraction', async () => {
          const extractionPromises = harvestResult.newComments.map((comment: any) =>
            inngest.send({
              name: 'tiktok/domain.extract',
              data: { commentId: comment.comment_id, videoId: videoId, commentText: comment.text },
            })
          );

          await Promise.all(extractionPromises);

          logger.info('Triggered domain extraction jobs', {
            count: extractionPromises.length,
            correlationId,
          });
        });
      }

      await step.run('complete-job-status', async () => {
        await inngest.send({
          name: 'tiktok/job.status.update',
          data: {
            jobId,
            status: 'completed',
            metadata: {
              videoId,
              commentsHarvested: harvestResult.commentsHarvested,
              pagesProcessed: harvestResult.pagesProcessed,
              domainsExtracted: harvestResult.domainsExtracted,
              extractionJobsTriggered: harvestResult.newComments?.length || 0,
              correlationId,
            },
          },
        });

        await supabase.from('system_logs').insert({
          event_type: 'job_complete',
          level: 'info',
          message: 'Comment harvesting completed',
          job_id: jobId,
          metadata: {
            videoId,
            commentsHarvested: harvestResult.commentsHarvested,
            pagesProcessed: harvestResult.pagesProcessed,
            domainsExtracted: harvestResult.domainsExtracted,
            correlationId,
          },
        });
      });

      return {
        success: true,
        data: {
          videoId,
          commentsHarvested: harvestResult.commentsHarvested,
          pagesProcessed: harvestResult.pagesProcessed,
          domainsExtracted: harvestResult.domainsExtracted,
        },
        metadata: {
          executionTime: Date.now(),
          attempt,
        },
      } as JobResult;
    } catch (error) {
      logger.error('Comment harvesting job failed', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        videoId,
        attempt,
        correlationId,
      });

      const jobId = `harvesting-${videoId}`;
      await alertJobError(jobId, {
        error: error instanceof Error ? error.message : String(error),
        attempt,
      });

      await supabase.from('system_logs').insert({
        event_type: 'job_error',
        level: 'error',
        message: 'Comment harvesting job failed',
        job_id: jobId,
        metadata: {
          videoId,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          attempt,
          correlationId,
        },
      });

      await step.run('fail-job-status', async () => {
        await inngest.send({
          name: 'tiktok/job.status.update',
          data: {
            jobId,
            status: 'failed',
            metadata: {
              videoId,
              error: error instanceof Error ? error.message : String(error),
              attempt,
              willRetry: attempt < 3,
              correlationId,
            },
          },
        });
      });

      if (attempt >= 3) {
        await step.run('send-to-dead-letter-queue', async () => {
          await inngest.send({
            name: 'tiktok/system.retry',
            data: {
              originalEventName: 'tiktok/comment.harvest',
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

export const domainExtractionJob = inngest.createFunction(
  {
    id: 'domain-extraction',
    name: 'Domain Extraction from Comments',
    retries: 2,
    concurrency: {
      limit: 50,
    },
  },
  { event: 'tiktok/domain.extract' },
  async ({ event, step, logger, attempt }) => {
    const { commentId, videoId, commentText } = event.data;

    logger.info('Starting domain extraction job', {
      commentId,
      videoId,
      commentTextLength: commentText.length,
      attempt,
    });

    try {
      const domains = await step.run('extract-domains', async () => {
        const raw = extractDomains(commentText);
        const normalized = dedupeNormalized(raw);
        return normalized.map((n) => ({
          fullDomain: n.domainName,
          tld: n.tld,
          subdomain: n.subdomain,
          domainName: n.domainName,
          originalText: n.domainName,
        }));
      });

      if (domains.length === 0) {
        logger.info('No domains found in comment', { commentId });
        return {
          success: true,
          data: { domainsExtracted: 0 },
          metadata: { attempt },
        };
      }

      type ProcessedDomain = {
        domainId: string;
        domainName: string;
        mentionText: string;
      };
      const processingResults = await step.run('process-domains', async () => {
        const results: ProcessedDomain[] = [];
        for (const domainInfo of domains) {
          try {
            const { data: existingDomain } = await supabase
              .from('domain')
              .select('id')
              .eq('domain', domainInfo.domainName)
              .maybeSingle();
            let domainId;
            if (existingDomain) {
              domainId = existingDomain.id;
            } else {
              const { data: newDomain } = await supabase
                .from('domain')
                .insert({
                  domain: domainInfo.domainName,
                  first_seen: new Date().toISOString(),
                  last_seen: new Date().toISOString(),
                })
                .select('id')
                .single();
              domainId = newDomain.id;
            }

            await supabase.from('domain_mention').upsert(
              {
                domain: domainInfo.domainName,
                comment_id: commentId,
                video_id: videoId,
                created_at: new Date().toISOString(),
              },
              { onConflict: 'domain,video_id,comment_id' }
            );

            results.push({
              domainId,
              domainName: domainInfo.domainName,
              mentionText: domainInfo.originalText,
            });
          } catch (error) {
            logger.error('Failed to process domain', {
              domain: domainInfo.domainName,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
        return results;
      });

      logger.info('Domain extraction completed', {
        commentId,
        domainsExtracted: processingResults.length,
        totalDomainsFound: domains.length,
      });

      return {
        success: true,
        data: {
          domainsExtracted: processingResults.length,
          domains: processingResults,
        },
        metadata: {
          executionTime: Date.now(),
          attempt,
        },
      } as JobResult;
    } catch (error) {
      logger.error('Domain extraction job failed', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        commentId,
        attempt,
      });
      throw error;
    }
  }
);


