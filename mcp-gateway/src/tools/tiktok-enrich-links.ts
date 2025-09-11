import { z } from 'zod';
import axios from 'axios';
import { Tool } from '../types';
import { logger } from '../utils/logger';

const InputSchema = z.object({
  video_url: z.string().url().describe('TikTok video URL to analyze'),
  include_profile: z.boolean().optional().default(false).describe('Also fetch profile page for links'),
});

const OutputItemSchema = z.object({
  video_id: z.string(),
  raw_url: z.string().url(),
  final_url: z.string().url().nullable(),
  raw_host: z.string().nullable(),
  final_host: z.string().nullable(),
  source: z.enum(['video', 'profile']),
  is_promoted: z.boolean().default(false),
});

export type EnrichLinksInput = z.infer<typeof InputSchema>;
export type EnrichLinksItem = z.infer<typeof OutputItemSchema>;

export const tiktokEnrichLinksTool: Tool = {
  name: 'tiktok.enrich.links',
  description: 'Extract outbound links from a TikTok video (and optionally profile), following redirects',
  inputSchema: InputSchema.shape as Record<string, unknown>,

  handler: async (params: unknown): Promise<EnrichLinksItem[]> => {
    const start = Date.now();
    const input = InputSchema.parse(params);

    try {
      const apiToken: string =
        process.env.API_TOKEN ?? process.env.BRIGHTDATA_API_KEY ?? '';
      if (!apiToken) throw new Error('Missing Bright Data API token');
      const zone = process.env.WEB_UNLOCKER_ZONE ?? 'mcp_unlocker';

      const pages: Array<{ url: string; source: 'video' | 'profile' }> = [
        { url: input.video_url, source: 'video' },
      ];

      // Optionally include profile page
      if (input.include_profile) {
        try {
          const profileUrl = deriveProfileUrl(input.video_url);
          if (profileUrl) pages.push({ url: profileUrl, source: 'profile' });
        } catch {}
      }

      const out: EnrichLinksItem[] = [];
      const seen = new Set<string>();

      for (const page of pages) {
        const html = await brightDataFetchRaw(page.url, apiToken, zone);
        logger.info('tiktok.enrich.links fetched html', { source: page.source, length: html.length });
        const promoted = detectPromoted(html);
        const rawLinks = extractHttpLinks(html);
        for (const raw of rawLinks) {
          const key = `${page.source}:${raw}`;
          if (seen.has(key)) continue;
          seen.add(key);

          const { finalUrl } = await followRedirects(raw);
          const normalized: EnrichLinksItem = OutputItemSchema.parse({
            video_id: extractVideoId(input.video_url),
            raw_url: raw,
            final_url: finalUrl ?? null,
            raw_host: safeHost(raw),
            final_host: finalUrl ? safeHost(finalUrl) : null,
            source: page.source,
            is_promoted: promoted,
          });
          out.push(normalized);
        }
        // Also scan plain text and JSON for URL candidates beyond anchor tags
        const textUrls = extractTextUrls(html);
        for (const raw of textUrls) {
          const key = `${page.source}:${raw}`;
          if (seen.has(key)) continue;
          seen.add(key);
          const { finalUrl } = await followRedirects(raw);
          const normalized: EnrichLinksItem = OutputItemSchema.parse({
            video_id: extractVideoId(input.video_url),
            raw_url: raw,
            final_url: finalUrl ?? null,
            raw_host: safeHost(raw),
            final_host: finalUrl ? safeHost(finalUrl) : null,
            source: page.source,
            is_promoted: promoted,
          });
          out.push(normalized);
          if (out.length > 300) break; // safety cap
        }
      }

      logger.info({
        message: 'tiktok.enrich.links completed',
        tookMs: Date.now() - start,
        links: out.length,
      });
      return out;
    } catch (error) {
      logger.error('tiktok.enrich.links failed', error);
      throw error;
    }
  },
};

function deriveProfileUrl(videoUrl: string): string | null {
  try {
    const u = new URL(videoUrl);
    // Expect /@username/video/123...
    const parts = u.pathname.split('/').filter(Boolean);
    const atIdx = parts.findIndex((p) => p.startsWith('@'));
    if (atIdx >= 0) {
      return `${u.origin}/${parts[atIdx]}`;
    }
    return null;
  } catch {
    return null;
  }
}

async function brightDataFetchRaw(url: string, apiToken: string, zone: string): Promise<string> {
  const resp = await axios.post(
    'https://api.brightdata.com/request',
    {
      url,
      zone,
      format: 'raw',
    },
    {
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      responseType: 'text',
      timeout: 20000,
      validateStatus: () => true,
    }
  );
  if (resp.status >= 400) {
    throw new Error(`BrightData fetch failed: ${resp.status}`);
  }
  return String(resp.data || '');
}

function extractHttpLinks(html: string): string[] {
  const out: string[] = [];
  try {
    // naive href extraction
    const hrefRe = /href\s*=\s*"(https?:[^"\s]+)"/gi;
    let m: RegExpExecArray | null;
    while ((m = hrefRe.exec(html)) !== null && m[1]) {
      const url: string = String(m[1]);
      if (isLikelyOutbound(url)) out.push(url);
      if (out.length > 200) break; // safety
    }
  } catch {}
  return Array.from(new Set(out));
}

function extractTextUrls(html: string): string[] {
  const out: string[] = [];
  try {
    const urlRe = /(https?:\/\/[^\s"'<>]+?)(?=[\s"'<>]|$)/gi;
    let m: RegExpExecArray | null;
    while ((m = urlRe.exec(html)) !== null && m[1]) {
      const candidate = String(m[1]);
      if (isLikelyOutbound(candidate)) out.push(candidate);
      if (out.length > 200) break; // safety
    }
  } catch {}
  return Array.from(new Set(out));
}

function isLikelyOutbound(url: string): boolean {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    return !host.includes('tiktok.com');
  } catch {
    return false;
  }
}

function detectPromoted(html: string): boolean {
  try {
    const lower = html.toLowerCase();
    // Common signals
    const signals = [
      '#ad',
      'paid partnership',
      'sponsored',
      'promotion',
      'ad:\u00a0',
      'ad\u00a0',
      'ad badge',
    ];
    for (const s of signals) {
      if (lower.includes(s)) return true;
    }
    // Heuristic: presence of CTA button labels
    const ctas = ['shop now', 'learn more', 'buy now'];
    for (const c of ctas) {
      if (lower.includes(c)) return true;
    }
    return false;
  } catch {
    return false;
  }
}

async function followRedirects(url: string): Promise<{ finalUrl?: string }> {
  try {
    const resp = await axios.get(url, {
      maxRedirects: 5,
      timeout: 15000,
      validateStatus: () => true,
    });
    const finalUrl = resp.request?.res?.responseUrl || resp.headers?.['x-final-url'] || url;
    return { finalUrl: String(finalUrl) };
  } catch {
    return { finalUrl: undefined };
  }
}

function safeHost(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

function extractVideoId(url: string): string {
  const m = url.match(/\/video\/(\d+)/);
  return m?.[1] ?? Buffer.from(url).toString('base64').slice(0, 16);
}

export default tiktokEnrichLinksTool;


