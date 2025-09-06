import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DomainIdSchema } from "@/lib/validations";
import {
  createSuccessResponse,
  createErrorResponse,
  withErrorHandling,
  addRateLimitHeaders,
} from "@/lib/api";
import type { Database } from "@/types/database";

type Domain = Database["public"]["Tables"]["domain"]["Row"];
type DomainMention = Database["public"]["Tables"]["domain_mention"]["Row"];
type Comment = Database["public"]["Tables"]["comment"]["Row"];
type Video = Database["public"]["Tables"]["video"]["Row"];

/**
 * @swagger
 * /api/domains/{id}:
 *   get:
 *     summary: Get detailed domain information
 *     description: Retrieve comprehensive information about a specific domain including recent mentions, time series data, and related videos/comments.
 *     tags:
 *       - Domains
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Domain UUID
 *         example: "550e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: Successfully retrieved domain details
 *         headers:
 *           X-RateLimit-Limit:
 *             schema:
 *               type: integer
 *             description: The number of requests allowed per hour
 *           X-RateLimit-Remaining:
 *             schema:
 *               type: integer
 *             description: The number of requests remaining in the current window
 *           X-RateLimit-Reset:
 *             schema:
 *               type: integer
 *             description: Unix timestamp when the rate limit window resets
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DomainDetails'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Domain not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Domain not found"
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */

interface DomainDetails extends Domain {
  recent_mentions: Array<{
    id: string;
    source_type: "video" | "comment";
    context: string | null;
    created_at: string;
    video?: {
      id: string;
      tiktok_id: string;
      title: string | null;
      url: string;
    };
    comment?: {
      id: string;
      content: string;
      author_username: string;
      video: {
        id: string;
        tiktok_id: string;
        title: string | null;
        url: string;
      };
    };
  }>;
  time_series: Array<{
    date: string;
    mention_count: number;
  }>;
}

async function handleDomainGet(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Validate the domain ID parameter
  const { id } = DomainIdSchema.parse({ id: params.id });

  const supabase = await createClient();

  // Get domain details
  const { data: domain, error: domainError } = await supabase
    .from("domain")
    .select("*")
    .eq("id", id)
    .single();

  if (domainError) {
    if (domainError.code === "PGRST116") {
      throw new Error("Domain not found");
    }
    console.error("Supabase error:", domainError);
    throw new Error(`Database query failed: ${domainError.message}`);
  }

  // Get recent mentions with related data
  const { data: mentions, error: mentionsError } = await supabase
    .from("domain_mention")
    .select(
      `
      id,
      source_type,
      context,
      created_at,
      source_id,
      comment:comment(
        id,
        content,
        author_username,
        video:video(
          id,
          tiktok_id,
          title,
          url
        )
      ),
      video:video(
        id,
        tiktok_id,
        title,
        url
      )
    `
    )
    .eq("domain_id", id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (mentionsError) {
    console.error("Mentions query error:", mentionsError);
    throw new Error(
      `Failed to fetch domain mentions: ${mentionsError.message}`
    );
  }

  // Get time series data for the past 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: timeSeriesData, error: timeSeriesError } = await supabase.rpc(
    "get_domain_time_series",
    {
      p_domain_id: id,
      p_start_date: thirtyDaysAgo.toISOString(),
      p_end_date: new Date().toISOString(),
    }
  );

  // If the RPC doesn't exist, we'll create a fallback query
  let timeSeries: Array<{ date: string; mention_count: number }> = [];

  if (timeSeriesError) {
    console.warn(
      "Time series RPC not available, using fallback query:",
      timeSeriesError
    );

    // Fallback: Group mentions by date
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("domain_mention")
      .select("created_at")
      .eq("domain_id", id)
      .gte("created_at", thirtyDaysAgo.toISOString())
      .order("created_at", { ascending: true });

    if (!fallbackError && fallbackData) {
      // Group by date
      const dateGroups: Record<string, number> = {};
      fallbackData.forEach((mention) => {
        const date = mention.created_at.split("T")[0];
        dateGroups[date] = (dateGroups[date] || 0) + 1;
      });

      timeSeries = Object.entries(dateGroups).map(([date, count]) => ({
        date,
        mention_count: count,
      }));
    }
  } else {
    timeSeries = timeSeriesData || [];
  }

  // Format the response
  const domainDetails: DomainDetails = {
    ...domain,
    recent_mentions:
      mentions?.map((mention) => ({
        id: mention.id,
        source_type: mention.source_type,
        context: mention.context,
        created_at: mention.created_at,
        ...(mention.source_type === "comment" && mention.comment
          ? {
              comment: {
                id: mention.comment.id,
                content: mention.comment.content,
                author_username: mention.comment.author_username,
                video: mention.comment.video,
              },
            }
          : {}),
        ...(mention.source_type === "video" && mention.video
          ? {
              video: mention.video,
            }
          : {}),
      })) || [],
    time_series: timeSeries,
  };

  const response = createSuccessResponse(domainDetails);

  // Add rate limit headers
  return addRateLimitHeaders(response, {
    limit: 1000,
    remaining: 999,
    reset: Math.floor(Date.now() / 1000) + 3600,
  });
}

export const GET = withErrorHandling(handleDomainGet);
