import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withSecurity, AuthenticatedApiSecurity } from "@/lib/security/middleware";
import { createPaginatedResponse } from "@/lib/api";

export const GET = withSecurity(
  async (request: NextRequest) => {
    const supabase = await createClient();
    const params = request.nextUrl.searchParams;
    const level = params.get("level") || undefined; // debug|info|warn|error
    const jobType = params.get("jobType") || undefined; // discovery|harvesting|system
    const since = params.get("since") || undefined; // ISO string
    const until = params.get("until") || undefined; // ISO string
    const page = Math.max(1, parseInt(params.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(params.get("limit") || "20", 10)));
    const offset = (page - 1) * limit;

    let query = supabase
      .from("v_recent_system_events")
      .select("event_type, level, message, created_at, job_type, job_status") as any;

    if (level) {
      query = (query as any).eq("level", level);
    }
    if (jobType) {
      query = (query as any).eq("job_type", jobType);
    }
    if (since) {
      query = (query as any).gte("created_at", since);
    }
    if (until) {
      query = (query as any).lte("created_at", until);
    }

    // Order and paginate
    query = (query as any).order("created_at", { ascending: false }).range(offset, offset + limit - 1);

    const { data, error, count } = (await query) as any;
    if (error) {
      throw new Error(`Database query failed: ${error.message}`);
    }

    const total = count || (data ? data.length : 0);
    const totalPages = Math.ceil(total / limit);
    return createPaginatedResponse(data || [], {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    });
  },
  AuthenticatedApiSecurity
);


