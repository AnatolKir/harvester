import { NextRequest, NextResponse } from "next/server";
import { rateLimitMiddleware } from "@/lib/rate-limit/middleware";
import { logRateLimitEvent } from "@/lib/rate-limit/monitoring";
import { createClient } from "@/lib/supabase/server";
import type {
  ApiResponse,
  VideoWithStats,
  PaginationParams,
} from "@/types/api";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const identifier =
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    "anonymous";

  const rateLimitResult = await rateLimitMiddleware(request, {
    authenticated: false,
  });

  if ("error" in rateLimitResult) {
    return rateLimitResult as NextResponse;
  }

  await logRateLimitEvent({
    identifier,
    endpoint: `/api/domains/${id}/videos`,
    timestamp: Date.now(),
    success: true,
    remaining: parseInt(
      (rateLimitResult.headers as any)["X-RateLimit-Remaining"]
    ),
    limit: parseInt((rateLimitResult.headers as any)["X-RateLimit-Limit"]),
  });

  try {
    const { searchParams } = new URL(request.url);
    const pagination: PaginationParams = {
      page: parseInt(searchParams.get("page") || "1"),
      limit: Math.min(parseInt(searchParams.get("limit") || "20"), 100), // Max 100 items per page
    };

    // TODO: Replace with actual Supabase query
    // const supabase = await createClient()
    //
    // // First verify domain exists
    // const { data: domain, error: domainError } = await supabase
    //   .from('domain')
    //   .select('id')
    //   .eq('id', id)
    //   .single()
    //
    // if (domainError || !domain) {
    //   const notFoundResponse: ApiResponse = {
    //     success: false,
    //     error: 'Domain not found',
    //   }
    //   return NextResponse.json(notFoundResponse, { status: 404 })
    // }
    //
    // // Get videos where this domain was mentioned with mention count
    // const offset = (pagination.page! - 1) * pagination.limit!
    // const { data: videos, error, count } = await supabase
    //   .from('video')
    //   .select(`
    //     *,
    //     domain_mention_count:domain_mention!inner (
    //       count
    //     )
    //   `)
    //   .eq('domain_mention.domain_id', id)
    //   .order('created_at', { ascending: false })
    //   .range(offset, offset + pagination.limit! - 1)
    //
    // if (error) {
    //   throw error
    // }

    // Mock data for now
    if (id !== "1" && id !== "2" && id !== "3") {
      const notFoundResponse: ApiResponse = {
        success: false,
        error: "Domain not found",
      };
      const response = NextResponse.json(notFoundResponse, { status: 404 });

      Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
        response.headers.set(key, value);
      });

      return response;
    }

    const mockVideos: VideoWithStats[] = [
      {
        id: "video-1",
        video_id: "tiktok-video-1",
        url: "https://www.tiktok.com/@user/video/1234567890123456789",
        title: "Summer Fashion Haul 2024",
        description: "Check out my latest summer finds! Links in comments",
        view_count: 15420,
        share_count: 89,
        comment_count: 156,
        is_promoted: true,
        created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        last_scraped_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        scrape_status: "completed" as const,
        error_message: null,
        metadata: null,
        domain_mention_count: id === "1" ? 3 : id === "2" ? 5 : 1,
      },
      {
        id: "video-2",
        video_id: "tiktok-video-2",
        url: "https://www.tiktok.com/@user2/video/2345678901234567890",
        title: "Unboxing My Latest Purchase",
        description: "Excited to try this new product! What do you think?",
        view_count: 8930,
        share_count: 45,
        comment_count: 78,
        is_promoted: true,
        created_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        last_scraped_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        scrape_status: "completed" as const,
        error_message: null,
        metadata: null,
        domain_mention_count: id === "1" ? 2 : id === "2" ? 4 : 2,
      },
      {
        id: "video-3",
        video_id: "tiktok-video-3",
        url: "https://www.tiktok.com/@user3/video/3456789012345678901",
        title: "Must-Have Items for Fall",
        description: "These are my top picks for the season!",
        view_count: 12350,
        share_count: 67,
        comment_count: 94,
        is_promoted: true,
        created_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        last_scraped_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        scrape_status: "completed" as const,
        error_message: null,
        metadata: null,
        domain_mention_count: id === "1" ? 1 : id === "2" ? 3 : 1,
      },
      {
        id: "video-4",
        video_id: "tiktok-video-4",
        url: "https://www.tiktok.com/@user4/video/4567890123456789012",
        title: "My Daily Routine Products",
        description: "These products changed my life! Check them out",
        view_count: 22100,
        share_count: 134,
        comment_count: 298,
        is_promoted: true,
        created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(),
        last_scraped_at: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
        scrape_status: "completed" as const,
        error_message: null,
        metadata: { influencer_tier: "micro" },
        domain_mention_count: id === "1" ? 4 : id === "2" ? 6 : 1,
      },
    ];

    // Filter based on domain for more realistic mock data
    let filteredVideos = mockVideos;
    if (id === "3") {
      // Suspicious domain has fewer videos
      filteredVideos = mockVideos.slice(0, 2);
    }

    const total = filteredVideos.length;
    const totalPages = Math.ceil(total / pagination.limit!);

    // Apply pagination
    const offset = (pagination.page! - 1) * pagination.limit!;
    const paginatedVideos = filteredVideos.slice(
      offset,
      offset + pagination.limit!
    );

    const apiResponse: ApiResponse<VideoWithStats[]> = {
      success: true,
      data: paginatedVideos,
      meta: {
        count: paginatedVideos.length,
        page: pagination.page!,
        pageSize: pagination.limit!,
        total,
        totalPages,
      },
    };

    const response = NextResponse.json(apiResponse);

    Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  } catch (error) {
    console.error("Error fetching domain videos:", error);

    const errorResponse: ApiResponse = {
      success: false,
      error: "Failed to fetch domain videos",
    };

    const response = NextResponse.json(errorResponse, { status: 500 });

    Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  }
}
