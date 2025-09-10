import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import { WorkerWebhookSchema } from "@/lib/validations";
import {
  createSuccessResponse,
  withErrorHandling,
  addCorsHeaders,
  addRateLimitHeaders,
} from "@/lib/api";
import type { SupabaseClient } from "@supabase/supabase-js";
import { headers } from "next/headers";

async function handleWorkerWebhook(request: NextRequest) {
  // Verify the request is from an authorized worker
  const headersList = await headers();
  const authHeader = headersList.get("authorization");
  const userAgent = headersList.get("user-agent");

  // Basic auth check - should be improved with proper API key validation
  const expectedToken = process.env.WORKER_WEBHOOK_TOKEN;
  if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
    throw new Error("Unauthorized");
  }

  // Parse and validate the request body
  const body = await request.json();
  const webhook = WorkerWebhookSchema.parse(body);

  const supabase = await createClient();

  // Create or update job log entry
  type JobLogInsert = Database["public"]["Tables"]["job_log"]["Insert"];

  const jobLogData: JobLogInsert = {
    id: webhook.jobId,
    job_type: webhook.jobType,
    status: webhook.status as JobLogInsert["status"],
    started_at:
      webhook.status === "started" ? new Date().toISOString() : undefined,
    completed_at:
      webhook.status === "completed" || webhook.status === "failed"
        ? new Date().toISOString()
        : undefined,
    error_message: webhook.error || null,
    metadata: {
      ...webhook.metadata,
      ...webhook.results,
      userAgent,
      timestamp: new Date().toISOString(),
    } as unknown as JobLogInsert["metadata"],
  };

  // Use upsert to handle both create and update scenarios
  const { error: jobLogError } = await supabase
    .from("job_log")
    .upsert(jobLogData as unknown as never, {
      onConflict: "id",
      ignoreDuplicates: false,
    });

  if (jobLogError) {
    console.error("Failed to update job log:", jobLogError);
    throw new Error(`Failed to update job log: ${jobLogError.message}`);
  }

  // Handle specific job completion actions
  if (webhook.status === "completed" && webhook.results) {
    await handleJobCompletionActions(supabase, webhook);
  }

  // If job failed, log the error details
  if (webhook.status === "failed" && webhook.error) {
    console.error(`Job ${webhook.jobId} failed:`, webhook.error);

    // You could add additional error handling here, such as:
    // - Sending alerts
    // - Updating related records
    // - Triggering retry logic
  }

  const response = createSuccessResponse({
    message: "Webhook processed successfully",
    jobId: webhook.jobId,
    status: webhook.status,
  });

  // Add CORS headers for worker communication
  let corsResponse = addCorsHeaders(response);

  // Add rate limit headers
  corsResponse = addRateLimitHeaders(corsResponse, {
    limit: 100,
    remaining: 99,
    reset: Math.floor(Date.now() / 1000) + 3600,
  });

  return corsResponse;
}

async function handleJobCompletionActions(
  supabase: SupabaseClient<Database>,
  webhook: {
    jobType: "discovery" | "comment_harvesting" | "domain_extraction" | string;
    results?: {
      videosProcessed?: number;
      commentsHarvested?: number;
      domainsExtracted?: number;
      [key: string]: unknown;
    } | null;
    jobId: string;
  }
) {
  const { jobType, results, jobId } = webhook;

  switch (jobType) {
    case "discovery":
      if (results?.videosProcessed) {
        console.log(
          `Discovery job ${jobId} processed ${results.videosProcessed} videos`
        );

        // Update video statuses if needed
        // You could add logic here to mark videos as discovered
      }
      break;

    case "comment_harvesting":
      if (results?.commentsHarvested) {
        console.log(
          `Comment harvesting job ${jobId} harvested ${results.commentsHarvested} comments`
        );

        // Trigger domain extraction if comments were harvested
        // This could send a signal to Inngest to start domain extraction
      }
      break;

    case "domain_extraction":
      if (results?.domainsExtracted) {
        console.log(
          `Domain extraction job ${jobId} extracted ${results.domainsExtracted} domains`
        );

        // Update domain statistics
        const { error: statsError } = await supabase.rpc(
          "refresh_domain_stats"
        );

        if (statsError) {
          console.warn("Failed to refresh domain stats:", statsError);
        }
      }
      break;

    default:
      console.log(`Unknown job type completed: ${jobType}`);
  }
}

// Handle OPTIONS requests for CORS
export async function OPTIONS(_request: NextRequest) {
  const response = new NextResponse(null, { status: 200 });
  return addCorsHeaders(response);
}

export const POST = withErrorHandling(handleWorkerWebhook);
