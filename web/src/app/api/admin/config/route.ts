import { NextRequest, NextResponse } from "next/server";

import { alertKillSwitchChanged } from "@/lib/alerts";
import { InngestAdmin } from "@/lib/inngest-admin";
import { withAdminGuard, auditAdminAction } from "@/lib/security/admin";

// GET /api/admin/config - Get system configuration
export const GET = withAdminGuard(async (_request: NextRequest) => {
  try {
    const hasAdminSupabase = Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    const config = hasAdminSupabase ? await InngestAdmin.getSystemConfig() : [];

    return NextResponse.json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error("Failed to get system config:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
});

// POST /api/admin/config - Update system configuration
export const POST = withAdminGuard(async (request: NextRequest) => {
  try {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      return NextResponse.json(
        { success: false, error: "Admin configuration not available" },
        { status: 503 }
      );
    }
    const body = await request.json();
    const { key, value, description } = body;

    if (!key) {
      throw new Error("Configuration key is required");
    }

    if (value === undefined) {
      throw new Error("Configuration value is required");
    }

    const result = await InngestAdmin.updateConfig(key, value, description);
    if (key === "kill_switch_active") {
      const active = Boolean(value);
      await alertKillSwitchChanged(active);
    }

    await auditAdminAction({
      request,
      eventType: "config_update",
      level: "info",
      message: `Config updated: ${key}`,
      metadata: { description },
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Failed to update system config:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
});
