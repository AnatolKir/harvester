import { NextRequest, NextResponse } from "next/server";

import { alertKillSwitchChanged } from "@/lib/alerts";
import { InngestAdmin } from "@/lib/inngest-admin";
import {
  withSecurity,
  AuthenticatedApiSecurity,
} from "@/lib/security/middleware";

// GET /api/admin/config - Get system configuration
export const GET = withSecurity(
  async (_request: NextRequest) => {
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
  },
  { ...AuthenticatedApiSecurity, requireAdmin: true }
);

// POST /api/admin/config - Update system configuration
export const POST = withSecurity(
  async (request: NextRequest) => {
    try {
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
  },
  {
    ...AuthenticatedApiSecurity,
    requireAdmin: true,
    allowedOrigins: [process.env.NEXT_PUBLIC_BASE_URL || ""],
  }
);
