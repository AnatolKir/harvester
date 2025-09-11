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
    const links = await step.run('extract-links', async () => {
      await acquireHttpEnrichmentToken({ identifier: 'global', logger, label: 'links_enrich' });
      const mcp = new MCPClient({
        baseUrl: process.env.MCP_BASE_URL!,
        apiKey: process.env.BRIGHTDATA_MCP_API_KEY!,
        stickyMinutes: parseInt(process.env.MCP_STICKY_SESSION_MINUTES || '10'),
      });
      const resp = (await mcp.call('tiktok.enrich.links', {
        video_url: videoUrl,
        include_profile: includeProfile,
      })) as { result?: Array<{ raw_url: string; final_url?: string | null; raw_host?: string | null; final_host?: string | null; source: 'video' | 'profile' }> };

      const items: Array<{ raw_url: string; final_url?: string | null; raw_host?: string | null; final_host?: string | null; source: 'video' | 'profile' }>
        = Array.isArray((resp as any).result) ? (resp as any).result : [];
      return items;
    });

    // Persist with duplicate suppression on (video_id, raw_url)
    const inserted = await step.run('persist-outbound-links', async () => {
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

    logger.info('Links enrichment completed', { videoId, extracted: links.length, inserted });

    // Write to system_logs for admin visibility
    await step.run('log-completion', async () => {
      try {
        await supabase.from('system_logs').insert({
          event_type: 'job_progress',
          level: 'info',
          message: 'Links enrichment completed',
          metadata: { videoId, extracted: links.length, inserted },
        });
      } catch {}
    });

    return {
      success: true,
      data: { extracted: links.length, inserted },
    } as JobResult;
  }
);


