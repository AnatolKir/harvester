import { NextRequest, NextResponse } from "next/server";

import { InngestAdmin } from "@/lib/inngest-admin";
import {
  withSecurity,
  AuthenticatedApiSecurity,
} from "@/lib/security/middleware";

// GET /api/admin/kill-switch - Check kill switch status
export const GET = withSecurity(
  async (_request: NextRequest) => {
    try {
      const isActive = await InngestAdmin.isKillSwitchActive();

      return NextResponse.json({
        success: true,
        data: {
          killSwitchActive: isActive,
        },
      });
    } catch (error) {
      console.error("Failed to check kill switch status:", error);
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

// POST /api/admin/kill-switch - Activate kill switch
export const POST = withSecurity(
  async (request: NextRequest) => {
    try {
      const body = await request.json();
      const { reason, requestedBy } = body;

      if (!reason) {
        throw new Error("Reason is required for activating kill switch");
      }

      if (!requestedBy) {
        throw new Error("requestedBy is required for activating kill switch");
      }

      const result = await InngestAdmin.activateEmergencyStop(
        reason,
        requestedBy
      );

      return NextResponse.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Failed to activate kill switch:", error);
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

// DELETE /api/admin/kill-switch - Deactivate kill switch
export const DELETE = withSecurity(
  async (request: NextRequest) => {
    try {
      const body = await request.json();
      const { reason, requestedBy } = body;

      if (!reason) {
        throw new Error("Reason is required for deactivating kill switch");
      }

      if (!requestedBy) {
        throw new Error("requestedBy is required for deactivating kill switch");
      }

      const result = await InngestAdmin.deactivateEmergencyStop(
        reason,
        requestedBy
      );

      return NextResponse.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Failed to deactivate kill switch:", error);
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
