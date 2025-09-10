import { NextRequest, NextResponse } from "next/server";

import { InngestAdmin } from "@/lib/inngest-admin";
import { getGlobalMcpBreaker } from "@/lib/mcp/circuitBreaker";
import { withAdminGuard, auditAdminAction } from "@/lib/security/admin";
import { createClient } from "@/lib/supabase/server";

// GET /api/admin/jobs - Get job status and metrics
export const GET = withAdminGuard(async (request: NextRequest) => {
  try {
    const url = new URL(request.url);
    const jobType = url.searchParams.get("type");
    const hoursBack = parseInt(url.searchParams.get("hours") || "24");

    const hasAdminSupabase = Boolean(
      (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) &&
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const [
      systemHealth,
      jobMetrics,
      activeJobs,
      recentLogs,
      mcpCircuitBreaker,
      backfillCheckpoint,
    ] = await Promise.all([
      hasAdminSupabase ? InngestAdmin.getSystemHealth() : Promise.resolve(null),
      hasAdminSupabase
        ? InngestAdmin.getJobMetrics(jobType || undefined, hoursBack)
        : Promise.resolve([]),
      hasAdminSupabase ? InngestAdmin.getActiveJobs() : Promise.resolve([]),
      hasAdminSupabase ? InngestAdmin.getRecentLogs(20) : Promise.resolve([]),
      getGlobalMcpBreaker().getStatus(),
      hasAdminSupabase
        ? (async () => {
            const supabase = await createClient();
            const { data } = await supabase
              .from("system_config")
              .select("value, updated_at")
              .eq("key", "discovery_backfill_checkpoint")
              .maybeSingle<{ value: unknown; updated_at: string }>();
            return data ?? null;
          })()
        : Promise.resolve(null),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        systemHealth,
        jobMetrics,
        activeJobs,
        recentLogs,
        mcpCircuitBreaker,
        backfillCheckpoint,
      },
    });
  } catch (error) {
    console.error("Failed to get job status:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
});

// POST /api/admin/jobs - Trigger jobs manually
export const POST = withAdminGuard(async (request: NextRequest) => {
  try {
    if (process.env.E2E_TEST_MODE === "true") {
      return NextResponse.json({ success: true, data: { ok: true } });
    }
    const body = await request.json();
    const { action, ...params } = body;

    let result;

    switch (action) {
      case "trigger_discovery":
        result = await InngestAdmin.triggerDiscovery(params);
        break;

      case "trigger_harvesting":
        if (!params.videoId) {
          throw new Error("videoId is required for harvesting");
        }
        result = await InngestAdmin.triggerHarvesting(
          params.videoId,
          params.maxPages || 2
        );
        break;

      case "trigger_health_check":
        result = await InngestAdmin.runHealthCheck();
        break;

      case "trigger_maintenance":
        result = await InngestAdmin.runMaintenance(params.daysToKeep || 90);
        break;

      case "trigger_backfill":
        if (!params.days) {
          throw new Error("days is required for backfill");
        }
        result = await InngestAdmin.triggerBackfill(
          parseInt(params.days as string, 10),
          params.limit ? parseInt(params.limit as string, 10) : 100
        );
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    await auditAdminAction({
      request,
      eventType: "admin_job_action",
      level: "info",
      message: `Admin action: ${action}`,
      metadata: params,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Failed to trigger job:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
});
