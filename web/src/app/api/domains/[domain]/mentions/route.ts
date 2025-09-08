import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withSecurity, AuthenticatedApiSecurity } from "@/lib/security/middleware";
import { createSuccessResponse } from "@/lib/api";

export const GET = withSecurity(
  async (request: NextRequest) => {
    const supabase = await createClient();
    const domain = decodeURIComponent(request.nextUrl.pathname.split("/domains/")[1].split("/mentions")[0]);

    const { data, error } = await supabase
      .from("v_domain_mentions_recent")
      .select("domain, comment_id, video_id, created_at")
      .eq("domain", domain)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      throw new Error(`Database query failed: ${error.message}`);
    }

    return createSuccessResponse(data || []);
  },
  AuthenticatedApiSecurity
);


