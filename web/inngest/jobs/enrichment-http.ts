import { inngest } from '../client';
import { JobResult } from '../types';
import { createClient } from '@supabase/supabase-js';
import { acquireHttpEnrichmentToken } from '../../src/lib/rate-limit/buckets';

function getServiceSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Supabase service credentials are not configured');
  }
  return createClient(url, key);
}

async function fetchWithTimeout(url: string, options: RequestInit & { timeoutMs?: number } = {}) {
  const { timeoutMs = 5000, ...rest } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...rest, signal: controller.signal, redirect: 'follow' });
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

async function isRobotsDisallowAll(domainUrl: string): Promise<boolean> {
  try {
    const robotsUrl = new URL('/robots.txt', domainUrl).toString();
    const res = await fetchWithTimeout(robotsUrl, {
      method: 'GET',
      timeoutMs: 3000,
      headers: { 'User-Agent': 'HarvesterBot/1.0' },
    });
    if (!res.ok) return false;
    const text = await res.text();
    const lines = text.split(/\r?\n/).map((l) => l.trim());
    let uaStar = false;
    for (const line of lines) {
      if (/^User-agent:\s*\*/i.test(line)) {
        uaStar = true;
        continue;
      }
      if (uaStar && /^User-agent:/i.test(line)) {
        uaStar = false;
      }
      if (uaStar && /^Disallow:\s*\/$/i.test(line)) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

export const httpEnrichmentJob = inngest.createFunction(
  {
    id: 'http-enrichment',
    name: 'Domain HTTP Enrichment',
    retries: 2,
    concurrency: { limit: 10 },
  },
  [
    { event: 'domain/http.enrich.scheduled' },
    { cron: '* * * * *' },
  ],
  async ({ step, logger, attempt }) => {
    const supabase = getServiceSupabase();
    logger.info('Starting HTTP enrichment job', { attempt });

    const killSwitchActive = await step.run('check-kill-switch', async () => {
      const { data: killSwitch } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'kill_switch_active')
        .maybeSingle();
      return killSwitch?.value === true;
    });

    if (killSwitchActive) {
      logger.warn('Kill switch is active, aborting HTTP enrichment job');
      return { success: false, error: 'Kill switch is active' } as JobResult;
    }

    const candidates = await step.run('select-candidates', async () => {
      const { data, error } = await supabase
        .from('domain')
        .select('id, domain, metadata, updated_at')
        .order('updated_at', { ascending: false })
        .limit(200);
      if (error) throw new Error(`Domain query failed: ${error.message}`);
      const out = (data || []).filter((d: any) => {
        const httpMeta = d?.metadata?.http;
        return !httpMeta || !httpMeta.checked_at;
      });
      return out.slice(0, 60);
    });

    let processed = 0;
    let updated = 0;

    for (const d of candidates) {
      if (processed >= 60) break;

      await step.run(`enrich-${d.id}`, async () => {
        await acquireHttpEnrichmentToken({ identifier: 'global', logger });

        const domainName: string = d.domain;
        const baseHttps = `https://${domainName}`;

        const robotsDisallowAll = await isRobotsDisallowAll(baseHttps);
        if (robotsDisallowAll) {
          const httpMeta = {
            reachable: false,
            status: null as number | null,
            server: null as string | null,
            method: null as string | null,
            url: baseHttps,
            reason: 'robots_disallow_root',
            checked_at: new Date().toISOString(),
          };
          const { error: upErr } = await supabase
            .from('domain')
            .update({ metadata: { ...(d.metadata || {}), http: httpMeta } })
            .eq('id', d.id);
          if (upErr) throw new Error(`Update failed: ${upErr.message}`);
          processed++;
          return;
        }

        const headers: Record<string, string> = { 'User-Agent': 'HarvesterBot/1.0' };
        let result: {
          status: number | null;
          server: string | null;
          method: string | null;
          urlTried: string;
        } = {
          status: null,
          server: null,
          method: null,
          urlTried: baseHttps,
        };

        try {
          let res = await fetchWithTimeout(baseHttps, { method: 'HEAD', headers, timeoutMs: 5000 });
          if (!res.ok && res.status === 405) {
            res = await fetchWithTimeout(baseHttps, { method: 'GET', headers, timeoutMs: 5000 });
            result.method = 'GET';
          } else {
            result.method = 'HEAD';
          }
          result.status = res.status;
          result.server = res.headers.get('server');
        } catch {
          const baseHttp = `http://${domainName}`;
          result.urlTried = baseHttp;
          try {
            let res = await fetchWithTimeout(baseHttp, {
              method: 'HEAD',
              headers,
              timeoutMs: 5000,
            });
            if (!res.ok && res.status === 405) {
              res = await fetchWithTimeout(baseHttp, { method: 'GET', headers, timeoutMs: 5000 });
              result.method = 'GET';
            } else {
              result.method = 'HEAD';
            }
            result.status = res.status;
            result.server = res.headers.get('server');
          } catch {
          }
        }

        const reachable =
          typeof result.status === 'number' && result.status > 0 && result.status < 600;
        const httpMeta = {
          reachable,
          status: result.status,
          server: result.server,
          method: result.method,
          url: result.urlTried,
          checked_at: new Date().toISOString(),
        };

        const updatePayload: any = { metadata: { ...(d.metadata || {}), http: httpMeta } };
        if (reachable) {
          updatePayload.verified_at = httpMeta.checked_at;
        }

        const { error: upErr } = await supabase.from('domain').update(updatePayload).eq('id', d.id);
        if (upErr) throw new Error(`Update failed: ${upErr.message}`);
        updated++;
        processed++;
      });
    }

    logger.info('HTTP enrichment completed', { processed, updated });
    return {
      success: true,
      data: { processed, updated },
      metadata: { attempt },
    } as JobResult;
  }
);


