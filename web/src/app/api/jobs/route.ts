import { NextRequest, NextResponse } from "next/server";
import {
  withSecurity,
  AuthenticatedApiSecurity,
} from "@/lib/security/middleware";
import { rateLimitMiddleware } from "@/lib/rate-limit/middleware";
import { logRateLimitEvent } from "@/lib/rate-limit/monitoring";
import { createClient } from "@/lib/supabase/server";
import type { ApiResponse, JobStatus, PaginationParams } from "@/types/api";

async function handleGet(request: NextRequest) {
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

    const supabase = await createClient();

    let query = supabase
      .from("job_log")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    if (jobType) {
      query = query.eq("job_type", jobType);
    }

    const offset = (pagination.page! - 1) * pagination.limit!;
    const {
      data: jobs,
      error,
      count,
    } = await query.range(offset, offset + pagination.limit! - 1);

    if (error) {
      // If table not present yet, return empty data with TODO note
      const apiResponse: ApiResponse<JobStatus[]> = {
        success: true,
        data: [],
        meta: {
          count: 0,
          page: pagination.page!,
          pageSize: pagination.limit!,
          total: 0,
          totalPages: 0,
        },
      };
      const response = NextResponse.json(apiResponse);
      Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      // TODO: Populate from system_logs if available
      return response;
    }

    const jobsWithDuration: JobStatus[] = (jobs || []).map((job: any) => ({
      ...job,
      duration_ms:
        job.completed_at && job.started_at
          ? new Date(job.completed_at).getTime() -
            new Date(job.started_at).getTime()
          : undefined,
    }));

    const total = count || 0;
    const totalPages = Math.ceil(total / pagination.limit!);

    const apiResponse: ApiResponse<JobStatus[]> = {
      success: true,
      data: jobsWithDuration,
      meta: {
        count: jobsWithDuration.length,
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

export const GET = withSecurity(handleGet as any, {
  ...AuthenticatedApiSecurity,
});
