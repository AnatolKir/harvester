import { NextRequest, NextResponse } from "next/server";
import { rateLimitMiddleware } from "@/lib/rate-limit/middleware";
import { logRateLimitEvent } from "@/lib/rate-limit/monitoring";
import { createClient } from "@/lib/supabase/server";
import type { ApiResponse, JobStatus, PaginationParams } from "@/types/api";

export async function GET(request: NextRequest) {
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
    endpoint: "/api/jobs",
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
      limit: Math.min(parseInt(searchParams.get("limit") || "50"), 100), // Max 100 items per page
    };

    const status = searchParams.get("status"); // Filter by status if provided
    const jobType = searchParams.get("job_type"); // Filter by job type if provided

    // TODO: Replace with actual Supabase query
    // const supabase = await createClient()

    // let query = supabase
    //   .from('job_log')
    //   .select('*')
    //   .order('created_at', { ascending: false })

    // Apply filters
    // if (status) {
    //   query = query.eq('status', status)
    // }

    // if (jobType) {
    //   query = query.eq('job_type', jobType)
    // }

    // Apply pagination
    // const offset = (pagination.page! - 1) * pagination.limit!
    // const { data: jobs, error, count } = await query
    //   .range(offset, offset + pagination.limit! - 1)

    // if (error) {
    //   throw error
    // }

    // Calculate duration for completed jobs
    // const jobsWithDuration: JobStatus[] = jobs.map(job => ({
    //   ...job,
    //   duration_ms: job.completed_at && job.started_at
    //     ? new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()
    //     : undefined
    // }))

    // Mock data for now
    const mockJobs: JobStatus[] = [
      {
        id: "job-1",
        job_type: "video_discovery",
        status: "completed",
        started_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        completed_at: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
        error_message: null,
        metadata: {
          videos_discovered: 45,
          ads_found: 23,
          region: "US",
        },
        created_at: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
        duration_ms: 2 * 60 * 1000, // 2 minutes
      },
      {
        id: "job-2",
        job_type: "comment_harvesting",
        status: "processing",
        started_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        completed_at: null,
        error_message: null,
        metadata: {
          video_id: "video-123",
          comments_processed: 156,
          comments_total: 200,
        },
        created_at: new Date(Date.now() - 7 * 60 * 1000).toISOString(),
        duration_ms: undefined,
      },
      {
        id: "job-3",
        job_type: "domain_extraction",
        status: "completed",
        started_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        completed_at: new Date(Date.now() - 13 * 60 * 1000).toISOString(),
        error_message: null,
        metadata: {
          domains_extracted: 12,
          new_domains: 3,
          comments_processed: 234,
        },
        created_at: new Date(Date.now() - 17 * 60 * 1000).toISOString(),
        duration_ms: 2 * 60 * 1000, // 2 minutes
      },
      {
        id: "job-4",
        job_type: "comment_harvesting",
        status: "failed",
        started_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        completed_at: new Date(Date.now() - 29 * 60 * 1000).toISOString(),
        error_message: "Rate limit exceeded from TikTok API",
        metadata: {
          video_id: "video-456",
          retry_count: 3,
          last_error_code: 429,
        },
        created_at: new Date(Date.now() - 32 * 60 * 1000).toISOString(),
        duration_ms: 1 * 60 * 1000, // 1 minute before failure
      },
      {
        id: "job-5",
        job_type: "video_discovery",
        status: "pending",
        started_at: new Date().toISOString(),
        completed_at: null,
        error_message: null,
        metadata: {
          scheduled_for: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        },
        created_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
        duration_ms: undefined,
      },
      {
        id: "job-6",
        job_type: "domain_validation",
        status: "completed",
        started_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        completed_at: new Date(Date.now() - 43 * 60 * 1000).toISOString(),
        error_message: null,
        metadata: {
          domains_checked: 28,
          suspicious_flagged: 2,
          validation_rules_applied: [
            "spam_keywords",
            "domain_age",
            "mention_frequency",
          ],
        },
        created_at: new Date(Date.now() - 47 * 60 * 1000).toISOString(),
        duration_ms: 2 * 60 * 1000,
      },
    ];

    // Apply mock filtering
    let filteredJobs = mockJobs;

    if (status) {
      filteredJobs = filteredJobs.filter((job) => job.status === status);
    }

    if (jobType) {
      filteredJobs = filteredJobs.filter((job) => job.job_type === jobType);
    }

    const total = filteredJobs.length;
    const totalPages = Math.ceil(total / pagination.limit!);

    // Apply pagination
    const offset = (pagination.page! - 1) * pagination.limit!;
    const paginatedJobs = filteredJobs.slice(
      offset,
      offset + pagination.limit!
    );

    const apiResponse: ApiResponse<JobStatus[]> = {
      success: true,
      data: paginatedJobs,
      meta: {
        count: paginatedJobs.length,
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
    console.error("Error fetching jobs:", error);

    const errorResponse: ApiResponse = {
      success: false,
      error: "Failed to fetch job status",
    };

    const response = NextResponse.json(errorResponse, { status: 500 });

    Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  }
}
