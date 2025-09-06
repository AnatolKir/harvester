import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { VideosQuerySchema } from "@/lib/validations";
import {
  createCursorPaginatedResponse,
  createErrorResponse,
  withErrorHandling,
  addRateLimitHeaders,
} from "@/lib/api";
import type { Database } from "@/types/database";

type Video = Database["public"]["Tables"]["video"]["Row"];

interface VideoWithDomains extends Video {
  domain_count: number;
  domains: Array<{
    id: string;
    domain: string;
    mention_count: number;
  }>;
  comment_count_with_domains: number;
}

async function handleVideosGet(request: NextRequest) {
  // Parse and validate query parameters
  const searchParams = request.nextUrl.searchParams;
  const rawParams = {
    cursor: searchParams.get("cursor"),
    limit: searchParams.get("limit"),
    search: searchParams.get("search"),
    status: searchParams.get("status"),
    hasComments: searchParams.get("hasComments"),
  };

  const { cursor, limit, search, status, hasComments } =
    VideosQuerySchema.parse(rawParams);

  const supabase = await createClient();

  // Build the base query with domain information
  let query = supabase.from("video").select(`
      *,
      domain_mentions:domain_mention!inner(
        domain:domain(
          id,
          domain,
          mention_count
        )
      )
    `);

  // Apply search filter
  if (search) {
    query = query.or(
      `title.ilike.%${search}%,description.ilike.%${search}%,tiktok_id.ilike.%${search}%`
    );
  }

  // Apply status filter
  if (status !== "all") {
    query = query.eq("scrape_status", status);
  }

  // Apply hasComments filter
  if (hasComments !== undefined) {
    if (hasComments) {
      query = query.gt("comment_count", 0);
    } else {
      query = query.eq("comment_count", 0);
    }
  }

  // Apply cursor pagination
  if (cursor) {
    // Decode cursor (base64 encoded timestamp)
    try {
      const cursorDate = new Date(Buffer.from(cursor, "base64").toString());
      query = query.lt("created_at", cursorDate.toISOString());
    } catch (error) {
      throw new Error("Invalid cursor format");
    }
  }

  // Order by creation date (newest first) and apply limit + 1 to check for more results
  query = query.order("created_at", { ascending: false }).limit(limit + 1);

  const { data, error } = await query;

  if (error) {
    console.error("Supabase error:", error);
    throw new Error(`Database query failed: ${error.message}`);
  }

  // Check if there are more results
  const hasMore = data.length > limit;
  const videos = hasMore ? data.slice(0, limit) : data;

  // Get unique domain count for each video
  const videosWithDomains: VideoWithDomains[] = await Promise.all(
    videos.map(async (video) => {
      // Get domain count for this video
      const { count: domainCount, error: domainCountError } = await supabase
        .from("domain_mention")
        .select("domain_id", { count: "exact", head: true })
        .eq("source_id", video.id)
        .eq("source_type", "video");

      if (domainCountError) {
        console.warn(
          `Failed to get domain count for video ${video.id}:`,
          domainCountError
        );
      }

      // Get comment domain count
      const { count: commentDomainCount, error: commentDomainError } =
        await supabase
          .from("domain_mention")
          .select("*", { count: "exact", head: true })
          .in("source_id", [
            // Subquery to get comment IDs for this video
          ])
          .eq("source_type", "comment");

      // Simplified approach - get domains mentioned in this video's context
      const { data: domainsData, error: domainsError } = await supabase
        .from("domain_mention")
        .select(
          `
          domain:domain(
            id,
            domain,
            mention_count
          )
        `
        )
        .or(
          `source_id.eq.${video.id},source_id.in.(select id from comment where video_id = '${video.id}')`
        )
        .limit(10); // Limit to top 10 domains per video

      const uniqueDomains =
        domainsData?.reduce(
          (acc, item) => {
            if (item.domain && !acc.find((d) => d.id === item.domain.id)) {
              acc.push(item.domain);
            }
            return acc;
          },
          [] as Array<{ id: string; domain: string; mention_count: number }>
        ) || [];

      return {
        ...video,
        domain_count: domainCount || 0,
        domains: uniqueDomains,
        comment_count_with_domains: 0, // This would require a more complex query
      };
    })
  );

  // Generate next cursor
  let nextCursor: string | null = null;
  if (hasMore && videosWithDomains.length > 0) {
    const lastVideo = videosWithDomains[videosWithDomains.length - 1];
    nextCursor = Buffer.from(lastVideo.created_at).toString("base64");
  }

  const response = createCursorPaginatedResponse(videosWithDomains, {
    cursor,
    nextCursor,
    hasMore,
    limit,
  });

  // Add rate limit headers
  return addRateLimitHeaders(response, {
    limit: 1000,
    remaining: 999,
    reset: Math.floor(Date.now() / 1000) + 3600,
  });
}

export const GET = withErrorHandling(handleVideosGet);
