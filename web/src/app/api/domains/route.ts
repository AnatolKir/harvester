import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DomainsQuerySchema } from "@/lib/validations";
import {
  createPaginatedResponse,
  createErrorResponse,
  withErrorHandling,
  addRateLimitHeaders,
} from "@/lib/api";
import type { Database } from "@/types/database";

type Domain = Database["public"]["Tables"]["domain"]["Row"];

/**
 * @swagger
 * /api/domains:
 *   get:
 *     summary: List domains with pagination and filtering
 *     description: Retrieve a paginated list of domains discovered from TikTok videos and comments. Supports search, date filtering, and sorting options.
 *     tags:
 *       - Domains
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           maxLength: 255
 *         description: Search domains by name (case-insensitive partial match)
 *         example: "example.com"
 *       - in: query
 *         name: dateFilter
 *         schema:
 *           type: string
 *           enum: [all, today, week, month]
 *           default: all
 *         description: Filter domains by discovery date
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [domain, first_seen_at, last_seen_at, mention_count, unique_video_count]
 *           default: last_seen_at
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order (ascending or descending)
 *     responses:
 *       200:
 *         description: Successfully retrieved domains
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
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Domain'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */

async function handleDomainsGet(request: NextRequest) {
  // Parse and validate query parameters
  const searchParams = request.nextUrl.searchParams;
  const rawParams = {
    search: searchParams.get("search"),
    dateFilter: searchParams.get("dateFilter"),
    page: searchParams.get("page"),
    limit: searchParams.get("limit"),
    sortBy: searchParams.get("sortBy"),
    sortOrder: searchParams.get("sortOrder"),
  };

  const { search, dateFilter, page, limit, sortBy, sortOrder } =
    DomainsQuerySchema.parse(rawParams);
  const offset = (page - 1) * limit;

  const supabase = await createClient();

  // Build the query
  let query = supabase.from("domain").select("*", { count: "exact" });

  // Apply search filter
  if (search) {
    query = query.ilike("domain", `%${search}%`);
  }

  // Apply date filter
  if (dateFilter !== "all") {
    const now = new Date();
    let threshold: Date;

    switch (dateFilter) {
      case "today":
        threshold = new Date(now.setHours(0, 0, 0, 0));
        break;
      case "week":
        threshold = new Date(now.setDate(now.getDate() - 7));
        break;
      case "month":
        threshold = new Date(now.setMonth(now.getMonth() - 1));
        break;
      default:
        threshold = new Date(0); // fallback
    }

    query = query.gte("first_seen", threshold.toISOString());
  }

  // Apply sorting
  const sortAscending = sortOrder === "asc";
  query = query.order(sortBy, { ascending: sortAscending });

  // Apply pagination
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error("Supabase error:", error);
    throw new Error(`Database query failed: ${error.message}`);
  }

  const total = count || 0;
  const totalPages = Math.ceil(total / limit);

  const response = createPaginatedResponse(data || [], {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  });

  // Add rate limit headers (placeholder values - should be integrated with actual rate limiter)
  return addRateLimitHeaders(response, {
    limit: 1000,
    remaining: 999,
    reset: Math.floor(Date.now() / 1000) + 3600,
  });
}

export const GET = withErrorHandling(handleDomainsGet);
