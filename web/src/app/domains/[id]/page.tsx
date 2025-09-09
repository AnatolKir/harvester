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

type DomainMeta = {
  id: string;
  metadata: { http?: HttpMeta } | null;
  verified_at?: string | null;
};

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const supabase = await createClient();
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      params.id
    );
  const query = supabase.from("domain").select("domain").limit(1);
  const { data } = isUuid
    ? await query.eq("id", params.id).maybeSingle<{ domain: string | null }>()
    : await query
        .eq("domain", params.id)
        .maybeSingle<{ domain: string | null }>();

  const domain = data?.domain ?? "Domain";
  return {
    title: `${domain} • Domain Details`,
    description: `Mentions, related videos, and activity for ${domain}.`,
  };
}

async function getData(domainId: string) {
  const supabase = await createClient();

  // Fallback to base domain row to avoid dependency on views
  const { data: base, error: baseErr } = await supabase
    .from("domain")
    .select(
      "id, domain, first_seen, last_seen, total_mentions, unique_videos, unique_author_count, is_suspicious"
    )
    .eq("id", domainId)
    .maybeSingle<{
      id: string;
      domain: string;
      first_seen: string | null;
      last_seen: string | null;
      total_mentions: number | null;
      unique_videos: number | null;
      unique_author_count: number | null;
      is_suspicious: boolean | null;
    }>();

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

  const details: DomainDetailsRow = {
    domain_id: base.id,
    domain: base.domain,
    first_seen: base.first_seen,
    last_seen: base.last_seen,
    total_mentions: base.total_mentions ?? 0,
    video_mentions: null,
    comment_mentions: null,
    unique_videos: base.unique_videos ?? null,
    unique_authors: base.unique_author_count ?? null,
    is_suspicious: base.is_suspicious ?? null,
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

  // Fetch related comments
  let commentsMap = new Map<string, CommentRow>();
  if (commentIds.length > 0) {
    const { data: comments, error: commentsError } = await supabase
      .from("comment")
      .select("id, video_id, content, author_username, posted_at")
      .in("id", commentIds)
      .returns<CommentRow[]>();
    if (commentsError) {
      throw new Error(`Failed to load comments: ${commentsError.message}`);
    }
    commentsMap = new Map((comments ?? []).map((c) => [c.id, c]));
  }

  // Fetch related videos
  let videosMap = new Map<string, VideoRow>();
  if (videoIds.length > 0) {
    const { data: videos, error: videosError } = await supabase
      .from("video")
      .select("id, video_id, url, title")
      .in("id", videoIds)
      .returns<VideoRow[]>();
    if (videosError) {
      throw new Error(`Failed to load videos: ${videosError.message}`);
    }
    videosMap = new Map((videos ?? []).map((v) => [v.id, v]));
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

  // Fetch domain metadata (http enrichment)
  const { data: domainRow } = await supabase
    .from("domain")
    .select("id, metadata")
    .eq("id", domainId)
    .maybeSingle<DomainMeta>();
  const httpMeta: HttpMeta | null = domainRow?.metadata?.http ?? null;
  const verifiedAt: string | null = httpMeta?.checked_at ?? null;

  return {
    details,
    mentions: mentions ?? [],
    comments: commentsMap,
    videos: videosMap,
    timeseries,
    httpMeta,
    verifiedAt,
  };
}

export default async function DomainDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();

  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      params.id
    );
  let effectiveId = params.id;
  if (!isUuid) {
    const { data } = await supabase
      .from("domain")
      .select("id")
      .eq("domain", params.id)
      .maybeSingle<{ id: string | null }>();
    if (!data?.id) {
      notFound();
    }
    effectiveId = data.id as string;
  }

  const {
    details,
    mentions,
    comments,
    videos,
    timeseries,
    httpMeta,
    verifiedAt,
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
