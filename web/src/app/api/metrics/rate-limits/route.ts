import { NextRequest, NextResponse } from "next/server";
import { withSecurity, AuthenticatedApiSecurity } from "@/lib/security/middleware";
import { getRateLimitMetrics } from "@/lib/rate-limit/monitoring";

async function handleGet(_request: NextRequest) {
  try {
    const metrics = await getRateLimitMetrics();
    return NextResponse.json({ success: true, data: metrics });
  } catch (error) {
    console.error("Failed to fetch rate-limit metrics", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch rate-limit metrics" },
      { status: 500 }
    );
  }
}

export const GET = withSecurity(handleGet as any, {
  ...AuthenticatedApiSecurity,
});


