import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DomainsQuerySchema } from "@/lib/validations";
import { createPaginatedResponse } from "@/lib/api";
import { withValidation, AuthenticatedApiSecurity } from "@/lib/security/middleware";
// Domain types come from view; no direct table type import here

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

export const GET = withValidation(
  DomainsQuerySchema,
  async (
    _request: NextRequest,
    { search, dateFilter, page, limit, sortBy, sortOrder },
    _context
  ): Promise<NextResponse> => {
    const offset = (page - 1) * limit;
    const supabase = await createClient();

    // Map sortBy to view columns
    const sortColumn =
      sortBy === "first_seen"
        ? "first_seen"
        : sortBy === "last_seen"
        ? "last_seen"
        : sortBy === "total_mentions"
        ? "total_mentions"
        : "last_seen"; // default

    let query = supabase
      .from("v_domains_overview")
      .select("domain, total_mentions, first_seen, last_seen", { count: "exact" });

    if (search) {
      query = query.ilike("domain", `%${search}%`);
    }

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
          threshold = new Date(0);
      }
      query = query.gte("first_seen", threshold.toISOString());
    }

    query = query.order(sortColumn, { ascending: sortOrder === "asc" });
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) {
      throw new Error(`Database query failed: ${error.message}`);
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);
    return createPaginatedResponse(data || [], {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    });
  },
  AuthenticatedApiSecurity
);
