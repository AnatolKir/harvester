import { NextRequest, NextResponse } from "next/server";
import { InngestAdmin } from "@/lib/inngest-admin";

// GET /api/admin/dead-letter-queue - Get dead letter queue items
export async function GET(request: NextRequest) {
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
}

// POST /api/admin/dead-letter-queue/retry - Retry a job from dead letter queue
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { dlqId } = body;

    if (!dlqId) {
      throw new Error("Dead letter queue item ID is required");
    }

    const result = await InngestAdmin.retryDeadLetterJob(dlqId);

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
}
