import { NextRequest, NextResponse } from "next/server";
import { InngestAdmin } from "@/lib/inngest-admin";

// GET /api/admin/jobs - Get job status and metrics
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const jobType = url.searchParams.get("type");
    const hoursBack = parseInt(url.searchParams.get("hours") || "24");

    const [systemHealth, jobMetrics, activeJobs, recentLogs] =
      await Promise.all([
        InngestAdmin.getSystemHealth(),
        InngestAdmin.getJobMetrics(jobType || undefined, hoursBack),
        InngestAdmin.getActiveJobs(),
        InngestAdmin.getRecentLogs(20),
      ]);

    return NextResponse.json({
      success: true,
      data: {
        systemHealth,
        jobMetrics,
        activeJobs,
        recentLogs,
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
}

// POST /api/admin/jobs - Trigger jobs manually
export async function POST(request: NextRequest) {
  try {
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

      default:
        throw new Error(`Unknown action: ${action}`);
    }

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
}
