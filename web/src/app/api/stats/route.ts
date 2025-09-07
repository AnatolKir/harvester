import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createSuccessResponse,
  createErrorResponse,
  withErrorHandling,
  addRateLimitHeaders,
} from "@/lib/api";

interface DashboardStats {
  totalDomains: number;
  newToday: number;
  totalMentions: number;
  activeVideos: number;
  trending: Array<{
    domain: string;
    growth: number;
    mentions: number;
    domain_id?: string;
  }>;
  processingStatus: {
    lastRun: string | null;
    status: "pending" | "processing" | "completed" | "failed";
    videosProcessed: number;
    commentsHarvested: number;
    domainsExtracted: number;
  };
  timeSeriesData: Array<{
    date: string;
    domains: number;
    mentions: number;
  }>;
}

async function handleStatsGet(request: NextRequest) {
  const supabase = await createClient();

  // Get today's date for filtering
  const today = new Date();
  const todayStart = new Date(today.setHours(0, 0, 0, 0)).toISOString();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Execute all queries in parallel for better performance
  const [
    totalDomainsResult,
    newTodayResult,
    totalMentionsResult,
    activeVideosResult,
    trendingResult,
    recentJobResult,
    timeSeriesResult,
  ] = await Promise.allSettled([
    // Total domains count
    supabase.from("domain").select("*", { count: "exact", head: true }),

    // New domains today
    supabase
      .from("domain")
      .select("*", { count: "exact", head: true })
      .gte("first_seen_at", todayStart),

    // Total mentions count
    supabase.from("domain_mention").select("*", { count: "exact", head: true }),

    // Active videos (videos with scrape_status completed and recent activity)
    supabase
      .from("video")
      .select("*", { count: "exact", head: true })
      .eq("scrape_status", "completed")
      .gte("last_scraped_at", sevenDaysAgo.toISOString()),

    // Trending domains via canonical view
    supabase.from("v_domains_trending").select("*").order("mentions_7d", { ascending: false }).limit(5),

    // Most recent job log entry
    supabase
      .from("job_log")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(1),

    // Time series data for the last 7 days
    supabase.rpc("get_stats_time_series", {
      p_days: 7,
    }),
  ]);

  // Handle results and fallbacks
  const totalDomains =
    totalDomainsResult.status === "fulfilled"
      ? totalDomainsResult.value.count || 0
      : 0;

  const newToday =
    newTodayResult.status === "fulfilled" ? newTodayResult.value.count || 0 : 0;

  const totalMentions =
    totalMentionsResult.status === "fulfilled"
      ? totalMentionsResult.value.count || 0
      : 0;

  const activeVideos =
    activeVideosResult.status === "fulfilled"
      ? activeVideosResult.value.count || 0
      : 0;

  // Handle trending domains
  let trending: Array<{
    domain: string;
    growth: number;
    mentions: number;
    domain_id?: string;
  }> = [];

  if (trendingResult.status === "fulfilled" && trendingResult.value.data) {
    trending = trendingResult.value.data.map((item: any) => ({
      domain: item.domain || "",
      growth: 0,
      mentions: item.mentions_7d || 0,
    }));
  } else {
    // Fallback: get top domains by mention count
    const fallbackTrending = await supabase
      .from("v_domains_heating")
      .select("domain, total_mentions, unique_videos")
      .order("total_mentions", { ascending: false })
      .limit(5);

    if (fallbackTrending.data) {
      trending = fallbackTrending.data.map((item: any) => ({
        domain: item.domain,
        growth: 0,
        mentions: item.total_mentions || 0,
      }));
    }
  }

  // Handle processing status
  let processingStatus = {
    lastRun: null as string | null,
    status: "pending" as const,
    videosProcessed: 0,
    commentsHarvested: 0,
    domainsExtracted: 0,
  };

  if (
    recentJobResult.status === "fulfilled" &&
    recentJobResult.value.data?.[0]
  ) {
    const job = recentJobResult.value.data[0];
    processingStatus = {
      lastRun: job.started_at,
      status: job.status,
      videosProcessed: (job.metadata as any)?.videosProcessed || 0,
      commentsHarvested: (job.metadata as any)?.commentsHarvested || 0,
      domainsExtracted: (job.metadata as any)?.domainsExtracted || 0,
    };
  }

  // Handle time series data
  let timeSeriesData: Array<{
    date: string;
    domains: number;
    mentions: number;
  }> = [];

  if (timeSeriesResult.status === "fulfilled" && timeSeriesResult.value.data) {
    timeSeriesData = timeSeriesResult.value.data;
  } else {
    // Fallback: generate last 7 days with manual queries
    const dates = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split("T")[0];
    }).reverse();

    timeSeriesData = await Promise.all(
      dates.map(async (date) => {
        const startOfDay = `${date}T00:00:00.000Z`;
        const endOfDay = `${date}T23:59:59.999Z`;

        const [domainsResult, mentionsResult] = await Promise.all([
          supabase
            .from("domain")
            .select("*", { count: "exact", head: true })
            .gte("first_seen_at", startOfDay)
            .lte("first_seen_at", endOfDay),
          supabase
            .from("domain_mention")
            .select("*", { count: "exact", head: true })
            .gte("created_at", startOfDay)
            .lte("created_at", endOfDay),
        ]);

        return {
          date,
          domains: domainsResult.count || 0,
          mentions: mentionsResult.count || 0,
        };
      })
    );
  }

  const stats: DashboardStats = {
    totalDomains,
    newToday,
    totalMentions,
    activeVideos,
    trending,
    processingStatus,
    timeSeriesData,
  };

  const response = createSuccessResponse(stats);

  // Add rate limit headers
  return addRateLimitHeaders(response, {
    limit: 1000,
    remaining: 999,
    reset: Math.floor(Date.now() / 1000) + 3600,
  });
}

export const GET = withErrorHandling(handleStatsGet);
