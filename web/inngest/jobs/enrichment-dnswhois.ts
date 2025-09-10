import { inngest } from '../client';
import { JobResult } from '../types';
import { createClient } from '@supabase/supabase-js';
import { acquireHttpEnrichmentToken } from '../../src/lib/rate-limit/buckets';
import * as dns from 'node:dns/promises';
import type { MxRecord } from 'node:dns';

function getServiceSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Supabase service credentials are not configured');
  }
  return createClient(url, key);
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutHandle: NodeJS.Timeout | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutHandle = setTimeout(() => reject(new Error('timeout')), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
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

type DnsMeta = {
  a?: string[];
  aaaa?: string[];
  cname?: string | null;
  mx?: boolean;
  checked_at: string;
};

type WhoisMeta = {
  created_at?: string | null;
  expires_at?: string | null;
  registrar?: string | null;
  checked_at: string;
};

async function resolveDnsRecords(domainName: string): Promise<DnsMeta> {
  const nowIso = new Date().toISOString();
  const result: DnsMeta = { checked_at: nowIso };

  try {
    const a = await withTimeout(dns.resolve4(domainName), 5000).catch(() => [] as string[]);
    if (Array.isArray(a) && a.length > 0) result.a = a;
  } catch {}

  try {
    const aaaa = await withTimeout(dns.resolve6(domainName), 5000).catch(() => [] as string[]);
    if (Array.isArray(aaaa) && aaaa.length > 0) result.aaaa = aaaa;
  } catch {}

  try {
    const cname = await withTimeout(dns.resolveCname(domainName), 5000).catch(() => [] as string[]);
    if (Array.isArray(cname) && cname.length > 0) result.cname = cname[0] ?? null;
  } catch {}

  try {
    const mx = await withTimeout(dns.resolveMx(domainName), 5000).catch(() => [] as MxRecord[]);
    result.mx = Array.isArray(mx) && mx.length > 0;
  } catch {
    result.mx = false;
  }

  return result;
}

async function fetchWhois(
  domainName: string,
  whoisUrl?: string,
  whoisKey?: string
): Promise<WhoisMeta | null> {
  if (!whoisUrl) return null;
  const nowIso = new Date().toISOString();

  try {
    const url = new URL(whoisUrl);
    url.searchParams.set('domain', domainName);
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (whoisKey) headers['Authorization'] = `Bearer ${whoisKey}`;

    const res = await fetchWithTimeout(url.toString(), { method: 'GET', headers, timeoutMs: 5000 });
    if (!res.ok) {
      return { created_at: null, expires_at: null, registrar: null, checked_at: nowIso };
    }
    const data = (await res.json()) as any;
    const created = (data.created_at || data.creation_date || data.created || null) as string | null;
    const expires = (data.expires_at || data.expiry_date || data.expires || null) as string | null;
    const registrar = (data.registrar || data.registrar_name || null) as string | null;
    return { created_at: created, expires_at: expires, registrar, checked_at: nowIso };
  } catch {
    return { created_at: null, expires_at: null, registrar: null, checked_at: nowIso };
  }
}

export const dnsWhoisEnrichmentJob = inngest.createFunction(
  {
    id: 'dns-whois-enrichment',
    name: 'Domain DNS/WHOIS Enrichment',
    retries: 2,
    concurrency: { limit: 5 },
  },
  [{ event: 'domain/dnswhois.enrich.scheduled' }, { cron: '* * * * *' }],
  async ({ step, logger, attempt }) => {
    const supabase = getServiceSupabase();
    logger.info('Starting DNS/WHOIS enrichment job', { attempt });

    const killSwitchActive = await step.run('check-kill-switch', async () => {
      const { data: killSwitch } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'kill_switch_active')
        .maybeSingle();
      return killSwitch?.value === true;
    });

    if (killSwitchActive) {
      logger.warn('Kill switch is active, aborting DNS/WHOIS enrichment job');
      return { success: false, error: 'Kill switch is active' } as JobResult;
    }

    const whoisUrl = process.env.WHOIS_API_URL;
    const whoisKey = process.env.WHOIS_API_KEY;

    const candidates = await step.run('select-candidates', async () => {
      const { data, error } = await supabase
        .from('domain')
        .select('id, domain, metadata, updated_at')
        .order('updated_at', { ascending: false })
        .limit(200);
      if (error) throw new Error(`Domain query failed: ${error.message}`);

      const out = (data || []).filter((d: any) => {
        const md = d?.metadata || {};
        const hasDns = Boolean(md.dns && md.dns.checked_at);
        const hasWhois = whoisUrl ? Boolean(md.whois && md.whois.checked_at) : true;
        return !hasDns || !hasWhois;
      });
      return out.slice(0, 60);
    });

    let processed = 0;
    let updated = 0;

    for (const d of candidates) {
      if (processed >= 60) break;

      await step.run(`enrich-${d.id}`, async () => {
        await acquireHttpEnrichmentToken({ identifier: 'global', logger, label: 'dns_whois' });

        const domainName: string = d.domain;

        const md = (d.metadata || {}) as { dns?: DnsMeta; whois?: WhoisMeta };
        const needDns = !(md.dns && md.dns.checked_at);
        const needWhois = Boolean(whoisUrl) && !(md.whois && md.whois.checked_at);

        let dnsMeta: DnsMeta | undefined = md.dns;
        let whoisMeta: WhoisMeta | null | undefined = md.whois;

        if (needDns) dnsMeta = await resolveDnsRecords(domainName);
        if (needWhois) whoisMeta = await fetchWhois(domainName, whoisUrl, whoisKey);

        const newMetadata: any = { ...(d.metadata || {}) };
        if (needDns && dnsMeta) newMetadata.dns = dnsMeta;
        if (needWhois && whoisMeta) newMetadata.whois = whoisMeta;

        if (!needDns && !needWhois) {
          processed++;
          return;
        }

        const hasResolvableDns = Boolean(
          dnsMeta &&
            ((dnsMeta.a && dnsMeta.a.length > 0) ||
              (dnsMeta.aaaa && dnsMeta.aaaa.length > 0) ||
              (dnsMeta.cname && dnsMeta.cname.length > 0))
        );

        const updatePayload: any = { metadata: newMetadata };
        if (needDns && hasResolvableDns && dnsMeta) {
          updatePayload.verified_at = dnsMeta.checked_at;
        }

        const { error: upErr } = await supabase.from('domain').update(updatePayload).eq('id', d.id);
        if (upErr) throw new Error(`Update failed: ${upErr.message}`);
        updated++;
        processed++;
      });
    }

    logger.info('DNS/WHOIS enrichment completed', { processed, updated });
    return { success: true, data: { processed, updated }, metadata: { attempt } } as JobResult;
  }
);


