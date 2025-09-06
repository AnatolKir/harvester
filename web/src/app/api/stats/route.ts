import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    // TODO: Replace with actual Supabase queries
    // const supabase = await createClient();

    // const [
    //   { count: totalDomains },
    //   { count: newToday },
    //   { data: trending },
    //   { data: recentJobs }
    // ] = await Promise.all([
    //   supabase.from('domain').select('*', { count: 'exact', head: true }),
    //   supabase.from('domain')
    //     .select('*', { count: 'exact', head: true })
    //     .gte('first_seen_at', new Date().toISOString().split('T')[0]),
    //   supabase.from('v_domains_trending').select('*').limit(5),
    //   supabase.from('job_log')
    //     .select('*')
    //     .order('started_at', { ascending: false })
    //     .limit(1)
    // ]);

    // Mock data for now
    const stats = {
      totalDomains: 156,
      newToday: 12,
      totalMentions: 3456,
      activeVideos: 89,
      trending: [
        { domain: "shopify.com", growth: 45, mentions: 234 },
        { domain: "etsy.com", growth: 32, mentions: 189 },
        { domain: "amazon.com", growth: 28, mentions: 456 },
      ],
      processingStatus: {
        lastRun: "2024-01-15T16:00:00Z",
        status: "completed",
        videosProcessed: 45,
        commentsHarvested: 678,
      },
      timeSeriesData: [
        { date: "2024-01-09", domains: 5, mentions: 45 },
        { date: "2024-01-10", domains: 8, mentions: 67 },
        { date: "2024-01-11", domains: 12, mentions: 89 },
        { date: "2024-01-12", domains: 7, mentions: 56 },
        { date: "2024-01-13", domains: 15, mentions: 123 },
        { date: "2024-01-14", domains: 9, mentions: 78 },
        { date: "2024-01-15", domains: 12, mentions: 94 },
      ],
    };

    return NextResponse.json({ data: stats });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch statistics" },
      { status: 500 }
    );
  }
}
