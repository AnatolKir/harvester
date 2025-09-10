import { NextRequest, NextResponse } from "next/server";
import { withSecurity, AuthenticatedApiSecurity } from "./middleware";
import { createServerClient } from "@supabase/ssr";
import { createClient as createServiceClient } from "@supabase/supabase-js";

type AdminGuardHandler = (request: NextRequest) => Promise<NextResponse>;

export function getAllowedAdminOrigins(): string[] {
  const fromEnv = (process.env.ADMIN_ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const base = process.env.NEXT_PUBLIC_BASE_URL || "";
  const unique = Array.from(new Set([...fromEnv, base].filter(Boolean)));
  return unique;
}

export function withAdminGuard(handler: AdminGuardHandler) {
  const hasAuthEnv = Boolean(
    (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  return withSecurity(handler, {
    ...AuthenticatedApiSecurity,
    requireAuth: hasAuthEnv,
    requireAdmin: hasAuthEnv,
    allowedOrigins: getAllowedAdminOrigins(),
  });
}

async function getAuthenticatedUserEmail(
  request: NextRequest
): Promise<string | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }
  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {},
      },
    });
    const { data } = await supabase.auth.getUser();
    return data.user?.email ?? null;
  } catch {
    return null;
  }
}

export async function auditAdminAction(params: {
  request: NextRequest;
  eventType: string;
  message: string;
  level?: "debug" | "info" | "warn" | "error";
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    // Missing admin credentials; skip audit in this environment
    return;
  }
  try {
    const actorEmail = await getAuthenticatedUserEmail(params.request);
    const origin =
      params.request.headers.get("origin") ||
      params.request.headers.get("referer") ||
      null;
    const correlationId =
      params.request.headers.get("x-correlation-id") ||
      params.request.headers.get("x-request-id") ||
      null;

    const service = createServiceClient(supabaseUrl, serviceRoleKey);

    await service.from("system_logs").insert({
      event_type: params.eventType,
      level: params.level || "info",
      message: params.message,
      metadata: {
        ...(params.metadata || {}),
        actorEmail,
        origin,
        correlationId,
        endpoint: params.request.nextUrl.pathname,
        method: params.request.method,
      },
    });
  } catch (e) {
    // Best effort; do not throw from audit path
    console.error("Failed to write admin audit log", e);
  }
}
