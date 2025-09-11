import { inngest } from '../client';
import { JobResult } from '../types';
import { createClient } from '@supabase/supabase-js';
import { MCPClient } from '../../web/src/lib/mcp/client';
import { acquireHttpEnrichmentToken } from '../../web/src/lib/rate-limit/buckets';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export const linksEnrichmentJob = inngest.createFunction(
  {
    id: 'links-enrichment',
    name: 'Video Outbound Links Enrichment',
    retries: 2,
    concurrency: { limit: 5 },
  },
  { event: 'tiktok/video.enrich.links' },
  async ({ event, step, logger, attempt }) => {
    const { videoId, includeProfile = false } = event.data as { videoId: string; includeProfile?: boolean };

    logger.info('Starting links enrichment', { videoId, includeProfile, attempt });
    const jobId = `enrich-${videoId}-${Date.now()}`;
    const jobStart = Date.now();
    await step.run('status-start', async () => {
      try {
        await inngest.send({
          name: 'tiktok/job.status.update',
          data: { jobId, status: 'running', jobType: 'enrichment_links', startedAt: jobStart },
        });
      } catch {}
    });

    // Fetch video URL from DB
    const videoUrl = await step.run('lookup-video-url', async () => {
      const { data, error } = await supabase
        .from('video')
        .select('url')
        .eq('video_id', videoId)
        .maybeSingle();
      if (error) throw new Error(`Video lookup failed: ${error.message}`);
      const url = data?.url as string | undefined;
      if (!url) throw new Error('Video URL not found');
      return url;
    });

    // Call MCP tool to extract links
    const extraction = await step.run('extract-links', async () => {
      await acquireHttpEnrichmentToken({ identifier: 'global', logger, label: 'links_enrich' });
      const mcp = new MCPClient({
        baseUrl: process.env.MCP_BASE_URL!,
        apiKey: process.env.BRIGHTDATA_MCP_API_KEY!,
        stickyMinutes: parseInt(process.env.MCP_STICKY_SESSION_MINUTES || '10'),
      });
      const resp = (await mcp.call('tiktok.enrich.links', {
        video_url: videoUrl,
        include_profile: includeProfile,
      })) as { result?: Array<{ raw_url: string; final_url?: string | null; raw_host?: string | null; final_host?: string | null; source: 'video' | 'profile'; is_promoted?: boolean }> };

      const items: Array<{ raw_url: string; final_url?: string | null; raw_host?: string | null; final_host?: string | null; source: 'video' | 'profile'; is_promoted?: boolean }>
        = Array.isArray((resp as any).result) ? (resp as any).result : [];
      // Fallback heuristic: if any outbound link exists, treat as promoted to avoid zero-yield
      const promoted = items.some((i) => i.is_promoted === true) || items.length > 0;
      return { items, promoted };
    });

    const links = extraction.items;
    const isPromoted = extraction.promoted;

    // Persist with duplicate suppression on (video_id, raw_url)
    const inserted = await step.run('persist-outbound-links', async () => {
      if (!isPromoted) return 0; // Skip saving links if not promoted
      let ok = 0;
      for (const l of links) {
        const { error } = await supabase
          .from('outbound_links')
          .upsert(
            {
              video_id: videoId,
              raw_url: l.raw_url,
              final_url: l.final_url ?? null,
              raw_host: l.raw_host ?? null,
              final_host: l.final_host ?? null,
              source: l.source,
              discovered_at: new Date().toISOString(),
            },
            { onConflict: 'video_id,raw_url' }
          );
        if (!error) ok++;
      }
      return ok;
    });

    // Update video promotion flag based on detection
    await step.run('update-video-promotion-flag', async () => {
      try {
        await supabase.from('video').upsert({ video_id: videoId, is_promoted: isPromoted } as any, { onConflict: 'video_id' });
      } catch {}
    });

    logger.info('Links enrichment completed', { videoId, extracted: links.length, inserted, isPromoted });
    if (!isPromoted && links.length > 0) {
      logger.warn('promoted_false_but_links_found', { videoId, links: links.length });
    }
    await step.run('status-complete', async () => {
      try {
        const completedAt = Date.now();
        await inngest.send({
          name: 'tiktok/job.status.update',
          data: {
            jobId,
            status: 'completed',
            jobType: 'enrichment_links',
            completedAt,
            executionTimeMs: completedAt - jobStart,
            metadata: { videoId, extracted: links.length, inserted, isPromoted },
          },
        });
      } catch {}
    });

    // Write to system_logs for admin visibility
    await step.run('log-completion', async () => {
      try {
        await supabase.from('system_logs').insert({
          event_type: 'job_progress',
          level: 'info',
          message: 'Links enrichment completed',
          metadata: { videoId, extracted: links.length, inserted, isPromoted },
        });
      } catch {}
    });

    return {
      success: true,
      data: { extracted: links.length, inserted },
    } as JobResult;
  }
);


