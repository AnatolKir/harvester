import { NextResponse } from "next/server";
import type { ApiResponse, ApiError } from "@/types/api";

/**
 * Create a standardized API success response
 */
export function createApiResponse<T>(
  data: T,
  meta?: ApiResponse<T>["meta"]
): ApiResponse<T> {
  return {
    success: true,
    data,
    meta,
  };
}

/**
 * Create a standardized API error response
 */
export function createApiError(
  message: string,
  statusCode: number = 500,
  code?: string,
  details?: any
): NextResponse {
  const error: ApiError = {
    code: code || `HTTP_${statusCode}`,
    message,
    details,
  };

  const response: ApiResponse = {
    success: false,
    error: error.message,
  };

  return NextResponse.json(response, { status: statusCode });
}

/**
 * Parse and validate pagination parameters
 */
export function parsePaginationParams(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(
    Math.max(1, parseInt(searchParams.get("limit") || "20")),
    100 // Maximum 100 items per page
  );

  return { page, limit };
}

/**
 * Calculate pagination metadata
 */
export function calculatePaginationMeta(
  totalItems: number,
  currentPage: number,
  pageSize: number
) {
  const totalPages = Math.ceil(totalItems / pageSize);

  return {
    count: Math.min(pageSize, totalItems - (currentPage - 1) * pageSize),
    page: currentPage,
    pageSize,
    total: totalItems,
    totalPages,
  };
}

/**
 * Validate date filter parameter
 */
export function validateDateFilter(
  filter: string | null
): "today" | "week" | "month" | "all" {
  if (!filter) return "all";

  const validFilters = ["today", "week", "month", "all"] as const;
  return validFilters.includes(filter as any) ? (filter as any) : "all";
}

/**
 * Get date threshold based on filter
 */
export function getDateThreshold(
  filter: "today" | "week" | "month" | "all"
): Date | null {
  const now = new Date();

  switch (filter) {
    case "today":
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case "week":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "month":
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case "all":
    default:
      return null;
  }
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Sanitize search query
 */
export function sanitizeSearchQuery(query: string | null): string | null {
  if (!query) return null;

  // Remove special characters that could be used for injection
  return query
    .trim()
    .replace(/[<>'";&\\]/g, "")
    .substring(0, 100); // Limit length
}

/**
 * Common error messages
 */
export const ErrorMessages = {
  INVALID_REQUEST: "Invalid request parameters",
  NOT_FOUND: "Resource not found",
  UNAUTHORIZED: "Unauthorized access",
  FORBIDDEN: "Access forbidden",
  RATE_LIMITED: "Rate limit exceeded",
  INTERNAL_ERROR: "Internal server error",
  INVALID_UUID: "Invalid ID format",
  INVALID_PAGINATION: "Invalid pagination parameters",
} as const;

/**
 * HTTP Status Codes
 */
export const StatusCodes = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const;
