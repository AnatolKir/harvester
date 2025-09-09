import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withAdminGuard } from "@/lib/security/admin";
import { createPaginatedResponse } from "@/lib/api";

export const GET = withAdminGuard(async (request: NextRequest) => {
  const supabase = await createClient();
  const params = request.nextUrl.searchParams;
  const level = params.get("level") || undefined; // debug|info|warn|error
  const jobType = params.get("jobType") || undefined; // discovery|harvesting|system
  const since = params.get("since") || undefined; // ISO string
  const until = params.get("until") || undefined; // ISO string
  const page = Math.max(1, parseInt(params.get("page") || "1", 10));
  const limit = Math.min(
    100,
    Math.max(1, parseInt(params.get("limit") || "20", 10))
  );
  const offset = (page - 1) * limit;

  let query = supabase
    .from("v_recent_system_events")
    .select("event_type, level, message, created_at, job_type, job_status");

  if (level) {
    query = query.eq("level", level);
  }
  if (jobType) {
    query = query.eq("job_type", jobType);
  }
  if (since) {
    query = query.gte("created_at", since);
  }
  if (until) {
    query = query.lte("created_at", until);
  }

  // Order and paginate
  query = query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  const res = await query;
  if (res.error) {
    throw new Error(`Database query failed: ${res.error.message}`);
  }

  const data = res.data || [];
  const total = data.length;
  const totalPages = Math.ceil((total || 0) / limit) || 1;
  return createPaginatedResponse(data, {
    page,
    limit,
    total,
    totalPages,
    hasNext: total === limit,
    hasPrev: page > 1,
  });
});
