import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withAdminGuard } from "@/lib/security/admin";

type LastHourRow = { videos_last_hour: number };
type ActiveRow = { active_enrichment: number };

export const GET = withAdminGuard(async (request: NextRequest) => {
  const supabase = await createClient();
  // touch request to satisfy lint (guard uses it internally for auth/cors)
  void request.nextUrl.pathname;

  const [{ data: lastHour }, { data: active }] = await Promise.all([
    supabase.from("v_discovery_last_hour").select("videos_last_hour").single(),
    supabase
      .from("v_active_enrichment_jobs")
      .select("active_enrichment")
      .single(),
  ]);

  const videosLastHour: number = Number(
    (lastHour as LastHourRow | null)?.videos_last_hour ?? 0
  );
  const activeEnrichment: number = Number(
    (active as ActiveRow | null)?.active_enrichment ?? 0
  );

  return NextResponse.json({
    success: true,
    data: {
      videos_last_hour: videosLastHour,
      active_enrichment: activeEnrichment,
    },
  });
});
