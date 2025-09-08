import { NextRequest, NextResponse } from "next/server";
import { InngestAdmin } from "@/lib/inngest-admin";
import {
  withSecurity,
  AuthenticatedApiSecurity,
} from "@/lib/security/middleware";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/admin/dead-letter-queue - Get dead letter queue items
export const GET = withSecurity(
  async (request: NextRequest) => {
    try {
      const url = new URL(request.url);
      const status = url.searchParams.get("status");

      const dlqItems = await InngestAdmin.getDeadLetterQueue(
        status || undefined
      );

      return NextResponse.json({
        success: true,
        data: dlqItems,
      });
    } catch (error) {
      console.error("Failed to get dead letter queue items:", error);
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

// POST /api/admin/dead-letter-queue/retry - Retry a job from dead letter queue
export const POST = withSecurity(
  async (request: NextRequest) => {
    try {
      const body = await request.json();
      const { dlqId, requestedBy } = body as {
        dlqId?: string;
        requestedBy?: string;
      };

      if (!dlqId) {
        throw new Error("Dead letter queue item ID is required");
      }

      const result = await InngestAdmin.retryDeadLetterJob(dlqId);

      // Log admin action
      await supabase.from("system_logs").insert({
        event_type: "dlq_retry",
        details: { dlqId, requestedBy },
        severity: "info",
        created_at: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Failed to retry dead letter queue job:", error);
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

// DELETE /api/admin/dead-letter-queue - Delete a DLQ item
export const DELETE = withSecurity(
  async (request: NextRequest) => {
    try {
      const body = await request.json();
      const { dlqId, requestedBy } = body as {
        dlqId?: string;
        requestedBy?: string;
      };

      if (!dlqId) {
        throw new Error("Dead letter queue item ID is required");
      }

      const result = await InngestAdmin.deleteDeadLetterItem(dlqId);

      // Log admin action
      await supabase.from("system_logs").insert({
        event_type: "dlq_delete",
        details: { dlqId, requestedBy },
        severity: "warning",
        created_at: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Failed to delete dead letter queue item:", error);
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
