import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

type DomainDetailsRow = {
  domain_id: string | null;
  domain: string | null;
  first_seen: string | null;
  last_seen: string | null;
  total_mentions: number | null;
  video_mentions: number | null;
  comment_mentions: number | null;
  unique_videos: number | null;
  unique_authors: number | null;
  is_suspicious: boolean | null;
};

type RecentMention = {
  comment_id: string | null;
  video_id: string | null;
  created_at: string;
};

type CommentRow = {
  id: string;
  video_id: string;
  content: string;
  author_username: string;
  posted_at: string | null;
};

type VideoRow = {
  id: string;
  video_id: string;
  url: string;
  title: string | null;
};

type HttpMeta = {
  reachable: boolean;
  status: number | null;
  server: string | null;
  method: string | null;
  url: string;
  checked_at: string;
  reason?: string;
};

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

type DomainMeta = {
  id: string;
  metadata: { http?: HttpMeta; dns?: DnsMeta; whois?: WhoisMeta } | null;
  verified_at?: string | null;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      id
    );
  let domain = "Domain";
  if (isUuid) {
    const { data } = await supabase
      .from("domain")
      .select("*")
      .eq("id", id)
      .maybeSingle<Record<string, unknown>>();
    if (data) {
      const d = data as Record<string, unknown>;
      domain = ((d["domain"] as string) ||
        (d["domain_name"] as string) ||
        "Domain") as string;
    }
  } else {
    // Try domain → domain_name
    let found: Record<string, unknown> | null = null;
    let res = await supabase
      .from("domain")
      .select("*")
      .eq("domain", id)
      .maybeSingle<Record<string, unknown>>();
    if (res.data) found = res.data;
    if (!found) {
      res = await supabase
        .from("domain")
        .select("*")
        .eq("domain_name", id)
        .maybeSingle<Record<string, unknown>>();
      if (res.data) found = res.data;
    }
    if (found) {
      const f = found as Record<string, unknown>;
      domain = ((f["domain"] as string) ||
        (f["domain_name"] as string) ||
        id) as string;
    } else {
      domain = id; // fallback to slug
    }
  }
  return {
    title: `${domain} • Domain Details`,
    description: `Mentions, related videos, and activity for ${domain}.`,
  };
}

async function getData(domainId: string) {
  const supabase = await createClient();

  // Schema-agnostic fetch: select all and map fields
  const { data: base, error: baseErr } = await supabase
    .from("domain")
    .select("*")
    .eq("id", domainId)
    .maybeSingle<Record<string, unknown>>();

  if (baseErr) {
    throw new Error(`Failed to load domain: ${baseErr.message}`);
  }

  if (!base) {
    return {
      details: null,
      mentions: [],
      comments: new Map(),
      videos: new Map(),
      timeseries: [] as { date: string; mentions: number }[],
      httpMeta: null as HttpMeta | null,
      verifiedAt: null as string | null,
    };
  }

  const b = base as Record<string, unknown>;
  const firstSeenVal =
    ((b["first_seen"] as string) || (b["first_seen_at"] as string)) ?? null;
  const lastSeenVal =
    ((b["last_seen"] as string) || (b["last_seen_at"] as string)) ?? null;
  const details: DomainDetailsRow = {
    domain_id: (b["id"] as string) || null,
    domain: ((b["domain"] as string) || (b["domain_name"] as string)) ?? null,
    first_seen: firstSeenVal,
    last_seen: lastSeenVal,
    total_mentions: ((b["total_mentions"] as number) ??
      (b["mention_count"] as number) ??
      0) as number,
    video_mentions: null,
    comment_mentions: null,
    unique_videos: ((b["unique_videos"] as number) ?? null) as number | null,
    unique_authors: ((b["unique_author_count"] as number) ??
      (b["unique_authors"] as number) ??
      null) as number | null,
    is_suspicious: ((b["is_suspicious"] as boolean) ?? null) as boolean | null,
  };

  // Recent mentions for this domain
  const { data: mentions, error: mentionsError } = await supabase
    .from("v_domain_mentions_recent")
    .select("comment_id, video_id, created_at")
    .eq("domain", details.domain!)
    .order("created_at", { ascending: false })
    .limit(20)
    .returns<RecentMention[]>();

  if (mentionsError) {
    throw new Error(`Failed to load recent mentions: ${mentionsError.message}`);
  }

  const commentIds = (mentions ?? [])
    .map((m) => m.comment_id)
    .filter((v): v is string => Boolean(v));
  const videoIds = (mentions ?? [])
    .map((m) => m.video_id)
    .filter((v): v is string => Boolean(v));

  // Fetch related comments (schema-agnostic mapping)
  let commentsMap = new Map<string, CommentRow>();
  if (commentIds.length > 0) {
    const { data: commentsRaw, error: commentsError } = await supabase
      .from("comment")
      .select("*")
      .in("id", commentIds);
    if (commentsError) {
      throw new Error(`Failed to load comments: ${commentsError.message}`);
    }
    const getString = (
      obj: Record<string, unknown>,
      key: string
    ): string | null => {
      const v = obj[key];
      return typeof v === "string" ? v : null;
    };
    const mapped: CommentRow[] = (commentsRaw || []).map(
      (row: Record<string, unknown>) => {
        const base = row as { id: string; video_id: string };
        return {
          id: base.id,
          video_id: base.video_id,
          content: getString(row, "content") ?? getString(row, "text") ?? "",
          author_username:
            getString(row, "author_username") ??
            getString(row, "username") ??
            "",
          posted_at:
            getString(row, "posted_at") ?? getString(row, "created_at"),
        };
      }
    );
    commentsMap = new Map(mapped.map((c) => [c.id, c]));
  }

  // Fetch related videos (schema-agnostic mapping)
  let videosMap = new Map<string, VideoRow>();
  if (videoIds.length > 0) {
    const { data: videosRaw, error: videosError } = await supabase
      .from("video")
      .select("*")
      .in("id", videoIds);
    if (videosError) {
      throw new Error(`Failed to load videos: ${videosError.message}`);
    }
    const getString = (
      obj: Record<string, unknown>,
      key: string
    ): string | null => {
      const v = obj[key];
      return typeof v === "string" ? v : null;
    };
    const mappedVideos: VideoRow[] = (videosRaw || []).map(
      (row: Record<string, unknown>) => {
        const base = row as { id: string; video_id: string };
        return {
          id: base.id,
          video_id: base.video_id,
          url: getString(row, "url") ?? getString(row, "video_url") ?? "",
          title: getString(row, "title") ?? getString(row, "caption"),
        };
      }
    );
    videosMap = new Map(mappedVideos.map((v) => [v.id, v]));
  }

  // Build a tiny time series for last 14 days by grouping the same mentions
  const byDay = new Map<string, number>();
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - 13);
  // seed zeros
  for (let i = 0; i < 14; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    byDay.set(d.toISOString().slice(0, 10), 0);
  }
  for (const m of mentions ?? []) {
    const key = new Date(m.created_at).toISOString().slice(0, 10);
    if (byDay.has(key)) {
      byDay.set(key, (byDay.get(key) ?? 0) + 1);
    }
  }
  const timeseries = Array.from(byDay.entries()).map(([date, mentions]) => ({
    date,
    mentions,
  }));

  // Fetch domain metadata (http/dns/whois enrichment)
  const { data: domainRow } = await supabase
    .from("domain")
    .select("id, metadata")
    .eq("id", domainId)
    .maybeSingle<DomainMeta>();
  const md = (domainRow?.metadata ?? null) as {
    http?: HttpMeta;
    dns?: DnsMeta;
    whois?: WhoisMeta;
  } | null;
  const httpMeta: HttpMeta | null = md?.http ?? null;
  const verifiedAt: string | null = httpMeta?.checked_at ?? null;

  return {
    details,
    mentions: mentions ?? [],
    comments: commentsMap,
    videos: videosMap,
    timeseries,
    httpMeta,
    verifiedAt,
    dnsMeta: md?.dns ?? null,
    whoisMeta: md?.whois ?? null,
  };
}

export default async function DomainDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      id
    );
  let effectiveId = id;
  if (!isUuid) {
    // Try domain then domain_name
    let lookedUp: string | null = null;
    const res1 = await supabase
      .from("domain")
      .select("id")
      .eq("domain", id)
      .maybeSingle<{ id: string | null }>();
    if (res1.data?.id) lookedUp = res1.data.id;
    if (!lookedUp) {
      const res2 = await supabase
        .from("domain")
        .select("id")
        .eq("domain_name", id)
        .maybeSingle<{ id: string | null }>();
      if (res2.data?.id) lookedUp = res2.data.id;
    }
    if (!lookedUp) {
      notFound();
    }
    effectiveId = lookedUp as string;
  }

  const {
    details,
    mentions,
    comments,
    videos,
    timeseries,
    httpMeta,
    verifiedAt,
    dnsMeta,
    whoisMeta,
  } = await getData(effectiveId);

  if (!details) {
    notFound();
  }

  const domain = details!.domain as string;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{domain}</h1>
        <p className="text-muted-foreground">
          Domain overview, recent mentions, and related videos.
        </p>
        {(dnsMeta || whoisMeta) && (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            {dnsMeta && (
              <span
                className={`inline-flex items-center rounded-full border px-2 py-1 ${
                  (dnsMeta.a?.length || 0) > 0 ||
                  (dnsMeta.aaaa?.length || 0) > 0 ||
                  (dnsMeta.cname ?? "")
                    ? "bg-emerald-50 text-emerald-800"
                    : "bg-amber-50 text-amber-800"
                }`}
                title={`A:${(dnsMeta.a ?? []).join(",") || "-"} | AAAA:${
                  (dnsMeta.aaaa ?? []).join(",") || "-"
                } | CNAME:${dnsMeta.cname ?? "-"} | MX:${dnsMeta.mx ? "yes" : "no"}`}
              >
                {(dnsMeta.a?.length || 0) > 0 ||
                (dnsMeta.aaaa?.length || 0) > 0 ||
                (dnsMeta.cname ?? "")
                  ? "DNS OK"
                  : "No DNS"}
              </span>
            )}
            {whoisMeta && (
              <>
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-1 ${
                    whoisMeta.created_at
                      ? "bg-emerald-50 text-emerald-800"
                      : "bg-amber-50 text-amber-800"
                  }`}
                >
                  Registered: {whoisMeta.created_at ? "Yes" : "No"}
                </span>
                {whoisMeta.created_at && (
                  <span className="inline-flex items-center rounded-full border bg-slate-50 px-2 py-1 text-slate-800">
                    Registered{" "}
                    {new Date(whoisMeta.created_at).toLocaleDateString()}
                  </span>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="bg-card rounded-lg border p-4">
          <div className="text-2xl font-bold">
            {details!.total_mentions ?? 0}
          </div>
          <p className="text-muted-foreground text-sm">Total mentions</p>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <div className="text-2xl font-bold">
            {details!.unique_videos ?? 0}
          </div>
          <p className="text-muted-foreground text-sm">Unique videos</p>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <div className="text-2xl font-bold">
            {details!.unique_authors ?? 0}
          </div>
          <p className="text-muted-foreground text-sm">Unique authors</p>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <div className="text-2xl font-bold">
            {details!.is_suspicious ? "Yes" : "No"}
          </div>
          <p className="text-muted-foreground text-sm">High activity</p>
        </div>
      </div>

      {httpMeta && (
        <div className="bg-card rounded-lg border p-4">
          <h2 className="mb-2 text-xl font-semibold">HTTP check</h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <div className="text-muted-foreground">Status</div>
              <div className="font-medium">{httpMeta.status ?? "-"}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Server</div>
              <div className="font-medium">{httpMeta.server ?? "-"}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Verified at</div>
              <div className="font-medium">
                {verifiedAt ? new Date(verifiedAt).toLocaleString() : "-"}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Method</div>
              <div className="font-medium">{httpMeta.method ?? "-"}</div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-card rounded-lg border p-4">
        <h2 className="mb-4 text-xl font-semibold">Recent activity (14d)</h2>
        <div className="flex h-24 items-end gap-2">
          {timeseries.map((p) => (
            <div key={p.date} className="flex-1">
              <div
                className="bg-primary/20 w-full"
                style={{ height: `${Math.min(100, p.mentions * 10)}%` }}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card rounded-lg border p-4">
        <h2 className="mb-4 text-xl font-semibold">Recent mentions</h2>
        <ul className="space-y-3">
          {mentions.map((m, idx) => {
            const c = m.comment_id ? comments.get(m.comment_id) : undefined;
            const v = m.video_id ? videos.get(m.video_id) : undefined;
            return (
              <li
                key={`${m.comment_id ?? idx}`}
                className="border-b pb-3 last:border-b-0"
              >
                <div className="flex flex-col gap-1">
                  <div className="text-muted-foreground text-sm">
                    {new Date(m.created_at).toLocaleString()}
                  </div>
                  {c ? (
                    <div>
                      <div className="font-medium">@{c.author_username}</div>
                      <div className="text-sm">{c.content}</div>
                    </div>
                  ) : (
                    <div className="text-sm">(comment unavailable)</div>
                  )}
                  {v && (
                    <a
                      className="text-primary text-sm underline"
                      href={v.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View video ({v.video_id})
                    </a>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
