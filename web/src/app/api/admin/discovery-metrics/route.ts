import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withAdminGuard } from "@/lib/security/admin";

export const GET = withAdminGuard(async (_request: NextRequest) => {
  const supabase = await createClient();

  const [{ data: lastHour }, { data: active }] = await Promise.all([
    supabase.from("v_discovery_last_hour").select("videos_last_hour").single(),
    supabase
      .from("v_active_enrichment_jobs")
      .select("active_enrichment")
      .single(),
  ]);

  return new Response(
    JSON.stringify({
      success: true,
      data: {
        videos_last_hour: lastHour?.videos_last_hour ?? 0,
        active_enrichment: active?.active_enrichment ?? 0,
      },
    }),
    { headers: { "Content-Type": "application/json" } }
  );
});
