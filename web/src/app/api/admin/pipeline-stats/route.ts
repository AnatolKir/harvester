import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withSecurity, AuthenticatedApiSecurity } from "@/lib/security/middleware";
import { createSuccessResponse } from "@/lib/api";

export const GET = withSecurity(
  async (_request: NextRequest) => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("v_pipeline_stats")
      .select("domains_day, comments_day, errors_day")
      .single();

    if (error) {
      throw new Error(`Database query failed: ${error.message}`);
    }

    return createSuccessResponse(data || { domains_day: 0, comments_day: 0, errors_day: 0 });
  },
  AuthenticatedApiSecurity
);


