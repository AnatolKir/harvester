import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  withSecurity,
  AuthenticatedApiSecurity,
} from "@/lib/security/middleware";
import { createSuccessResponse } from "@/lib/api";

export const GET = withSecurity(async (request: NextRequest) => {
  const supabase = await createClient();

  // Extract domain id from path and resolve to domain name
  const idSegment = decodeURIComponent(
    request.nextUrl.pathname.split("/domains/")[1].split("/mentions")[0]
  );

  const { data: domainRow, error: domainError } = await supabase
    .from("domain")
    .select("domain")
    .eq("id", idSegment)
    .maybeSingle();

  if (domainError) {
    throw new Error(`Domain lookup failed: ${domainError.message}`);
  }

  const typedDomainRow = domainRow as { domain?: string } | null;
  if (!typedDomainRow?.domain) {
    return createSuccessResponse([]);
  }

  const { data, error } = await supabase
    .from("v_domain_mentions_recent")
    .select("domain, comment_id, video_id, created_at")
    .eq("domain", String(typedDomainRow.domain))
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    throw new Error(`Database query failed: ${error.message}`);
  }

  return createSuccessResponse(data || []);
}, AuthenticatedApiSecurity);
