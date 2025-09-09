import { NextRequest, NextResponse } from "next/server";
import { InngestAdmin } from "@/lib/inngest-admin";
import { withAdminGuard, auditAdminAction } from "@/lib/security/admin";

// GET /api/admin/dead-letter-queue - Get dead letter queue items
export const GET = withAdminGuard(async (request: NextRequest) => {
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get("status");

    const dlqItems = await InngestAdmin.getDeadLetterQueue(status || undefined);

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
});

// POST /api/admin/dead-letter-queue/retry - Retry a job from dead letter queue
export const POST = withAdminGuard(async (request: NextRequest) => {
  try {
    if (process.env.E2E_TEST_MODE === "true") {
      return NextResponse.json({ success: true, data: { ok: true } });
    }
    const body = await request.json();
    const { dlqId, requestedBy } = body as {
      dlqId?: string;
      requestedBy?: string;
    };

    if (!dlqId) {
      throw new Error("Dead letter queue item ID is required");
    }

    const result = await InngestAdmin.retryDeadLetterJob(dlqId);

    await auditAdminAction({
      request,
      eventType: "dlq_retry",
      level: "info",
      message: `DLQ retry requested by ${requestedBy}`,
      metadata: { dlqId },
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
});

// DELETE /api/admin/dead-letter-queue - Delete a DLQ item
export const DELETE = withAdminGuard(async (request: NextRequest) => {
  try {
    if (process.env.E2E_TEST_MODE === "true") {
      return NextResponse.json({ success: true, data: { ok: true } });
    }
    const body = await request.json();
    const { dlqId, requestedBy } = body as {
      dlqId?: string;
      requestedBy?: string;
    };

    if (!dlqId) {
      throw new Error("Dead letter queue item ID is required");
    }

    const result = await InngestAdmin.deleteDeadLetterItem(dlqId);

    await auditAdminAction({
      request,
      eventType: "dlq_delete",
      level: "warn",
      message: `DLQ delete requested by ${requestedBy}`,
      metadata: { dlqId },
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
});
