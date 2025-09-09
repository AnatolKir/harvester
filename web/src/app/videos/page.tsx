import { createClient } from "@/lib/supabase/server";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

import type { Database } from "@/types/database";

type VideoRow = Database["public"]["Tables"]["video"]["Row"];

interface VideoWithStats
  extends Pick<
    VideoRow,
    | "id"
    | "video_id"
    | "url"
    | "created_at"
    | "last_scraped_at"
    | "scrape_status"
  > {
  domain_count: number;
  comment_count_with_domains: number;
}

interface SearchParams {
  search?: string;
  status?: "all" | "pending" | "processing" | "completed" | "failed";
  cursor?: string;
  limit?: string;
  sort?: "created_at" | "last_scraped_at";
  dir?: "asc" | "desc";
}

export const dynamic = "force-dynamic";

export default async function VideosPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const supabase = await createClient();

  const sp = (await searchParams) || {};
  const search = (sp.search || "").trim();
  const status = (sp.status || "all") as SearchParams["status"];
  const cursor = sp.cursor || undefined;
  const limitNum = Math.min(
    Math.max(parseInt(sp.limit || "25", 10) || 25, 1),
    100
  );
  const sort = (sp.sort || "created_at") as NonNullable<SearchParams["sort"]>;
  const dir = (sp.dir || "desc") as NonNullable<SearchParams["dir"]>;

  // Build base query against video table for filtering, sorting, cursoring
  let query = supabase
    .from("video")
    .select("id, video_id, url, created_at, last_scraped_at, scrape_status");

  if (search) {
    // Search across common fields
    query = query.or(
      `title.ilike.%${search}%,description.ilike.%${search}%,video_id.ilike.%${search}%,url.ilike.%${search}%`
    );
  }

  if (status && status !== "all") {
    query = query.eq("scrape_status", status);
  }

  // Cursor pagination (base64-encoded ISO timestamp from sort field)
  if (cursor) {
    try {
      const decoded = Buffer.from(cursor, "base64").toString("utf8");
      const iso = new Date(decoded).toISOString();
      if (dir === "desc") {
        query = query.lt(sort, iso);
      } else {
        query = query.gt(sort, iso);
      }
    } catch {
      // Ignore invalid cursor
    }
  }

  query = query.order(sort, { ascending: dir === "asc" }).limit(limitNum + 1);

  const { data: videosRaw, error } = await query;
  if (error) {
    throw new Error(`Failed to load videos: ${error.message}`);
  }

  const hasMore = (videosRaw?.length || 0) > limitNum;
  const videosSlice = (videosRaw || []).slice(0, limitNum);

  // Fetch domain/comment aggregates from view if available
  const videoIds = videosSlice.map((v) => v.id);

  // Default aggregates
  const aggregatesById: Record<
    string,
    { domain_count: number; comment_count_with_domains: number }
  > = {};

  if (videoIds.length > 0) {
    const { data: viewRows } = await supabase
      .from("v_videos_with_domains" as unknown as "video")
      .select("id, unique_domains_mentioned, total_comments")
      .in("id", videoIds);

    const rows = (viewRows ?? []) as unknown[];
    for (const row of rows) {
      if (row && typeof row === "object") {
        const obj = row as Record<string, unknown>;
        const id = obj["id"];
        const unique = obj["unique_domains_mentioned"];
        const total = obj["total_comments"];
        if (typeof id === "string") {
          aggregatesById[id] = {
            domain_count: typeof unique === "number" ? unique : 0,
            comment_count_with_domains: typeof total === "number" ? total : 0,
          };
        }
      }
    }
  }

  const videos: VideoWithStats[] = videosSlice.map((v) => ({
    id: v.id,
    video_id: v.video_id,
    url: v.url,
    created_at: v.created_at,
    last_scraped_at: v.last_scraped_at,
    scrape_status: v.scrape_status,
    domain_count: aggregatesById[v.id]?.domain_count ?? 0,
    comment_count_with_domains:
      aggregatesById[v.id]?.comment_count_with_domains ?? 0,
  }));

  // Compute next cursor
  const last = videos[videos.length - 1];
  const nextCursor =
    hasMore && last ? Buffer.from(String(last[sort])).toString("base64") : null;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Videos</h1>
          <p className="text-muted-foreground text-sm">
            Server-rendered list of videos with domain and comment aggregates.
          </p>
        </div>
      </div>

      {/* Results table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>TikTok ID</TableHead>
              <TableHead>URL</TableHead>
              <TableHead>Domain Count</TableHead>
              <TableHead>Comments w/ Domains</TableHead>
              <TableHead>Last Scraped</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {videos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  No results.
                </TableCell>
              </TableRow>
            ) : (
              videos.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">{v.video_id}</TableCell>
                  <TableCell>
                    {v.url ? (
                      <a
                        href={v.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary underline underline-offset-2"
                      >
                        Link
                      </a>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>{v.domain_count}</TableCell>
                  <TableCell>{v.comment_count_with_domains}</TableCell>
                  <TableCell>
                    {v.last_scraped_at
                      ? new Date(v.last_scraped_at).toLocaleString()
                      : "—"}
                  </TableCell>
                  <TableCell className="capitalize">
                    {v.scrape_status || "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Server-driven pagination */}
      <div className="flex justify-end">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href={undefined}
                aria-disabled
                className="pointer-events-none opacity-50"
              />
            </PaginationItem>
            <PaginationItem>
              {nextCursor ? (
                <PaginationNext
                  href={buildHref({
                    search,
                    status,
                    sort,
                    dir,
                    limit: limitNum,
                    cursor: nextCursor,
                  })}
                />
              ) : (
                <PaginationNext
                  href={undefined}
                  aria-disabled
                  className="pointer-events-none opacity-50"
                />
              )}
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}

function buildHref(params: {
  search?: string;
  status?: string;
  sort?: string;
  dir?: string;
  limit?: number;
  cursor?: string | null;
}) {
  const sp = new URLSearchParams();
  if (params.search) sp.set("search", params.search);
  if (params.status) sp.set("status", params.status);
  if (params.sort) sp.set("sort", params.sort);
  if (params.dir) sp.set("dir", params.dir);
  if (params.limit) sp.set("limit", String(params.limit));
  if (params.cursor) sp.set("cursor", params.cursor);
  const qs = sp.toString();
  return qs ? `/videos?${qs}` : "/videos";
}
