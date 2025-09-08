import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withSecurity, AuthenticatedApiSecurity } from "@/lib/security/middleware";
import { createSuccessResponse } from "@/lib/api";

export const GET = withSecurity(
  async (_request: NextRequest) => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("v_domains_new_today")
      .select("domain, mentions_today")
      .order("mentions_today", { ascending: false })
      .limit(100);

    if (error) {
      throw new Error(`Database query failed: ${error.message}`);
    }

    return createSuccessResponse(data || []);
  },
  AuthenticatedApiSecurity
);


