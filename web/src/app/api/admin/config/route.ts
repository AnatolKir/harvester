import { NextRequest, NextResponse } from "next/server";
import { InngestAdmin } from "@/lib/inngest-admin";
import { alertKillSwitchChanged } from "@/lib/alerts";

// GET /api/admin/config - Get system configuration
export async function GET(request: NextRequest) {
  try {
    const config = await InngestAdmin.getSystemConfig();

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
}

// POST /api/admin/config - Update system configuration
export async function POST(_request: NextRequest) {
  try {
    const body = await _request.json();
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
}
