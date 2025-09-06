import { NextResponse } from "next/server";
import { ZodError } from "zod";

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface CursorPaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: {
    cursor: string | null;
    nextCursor: string | null;
    hasMore: boolean;
    limit: number;
  };
}

export function createSuccessResponse<T>(
  data: T,
  status = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status }
  );
}

export function createPaginatedResponse<T>(
  data: T[],
  pagination: PaginatedResponse<T>["pagination"],
  status = 200
): NextResponse<PaginatedResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      pagination,
    },
    { status }
  );
}

export function createCursorPaginatedResponse<T>(
  data: T[],
  pagination: CursorPaginatedResponse<T>["pagination"],
  status = 200
): NextResponse<CursorPaginatedResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      pagination,
    },
    { status }
  );
}

export function createErrorResponse(
  message: string,
  status = 500,
  errors?: Record<string, string[]>
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      error: message,
      ...(errors && { errors }),
    },
    { status }
  );
}

export function createValidationErrorResponse(
  error: ZodError
): NextResponse<ApiResponse> {
  const errors = error.errors.reduce(
    (acc, err) => {
      const path = err.path.join(".");
      if (!acc[path]) acc[path] = [];
      acc[path].push(err.message);
      return acc;
    },
    {} as Record<string, string[]>
  );

  return NextResponse.json(
    {
      success: false,
      error: "Validation failed",
      errors,
    },
    { status: 400 }
  );
}

export function withErrorHandling<T extends any[], R>(
  handler: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R | NextResponse<ApiResponse>> => {
    try {
      return await handler(...args);
    } catch (error) {
      console.error("API Error:", error);

      if (error instanceof ZodError) {
        return createValidationErrorResponse(error);
      }

      if (error instanceof Error) {
        return createErrorResponse(error.message);
      }

      return createErrorResponse("An unexpected error occurred");
    }
  };
}

export function addRateLimitHeaders(
  response: NextResponse,
  headers: {
    limit?: number;
    remaining?: number;
    reset?: number;
  }
): NextResponse {
  if (headers.limit !== undefined) {
    response.headers.set("X-RateLimit-Limit", headers.limit.toString());
  }
  if (headers.remaining !== undefined) {
    response.headers.set("X-RateLimit-Remaining", headers.remaining.toString());
  }
  if (headers.reset !== undefined) {
    response.headers.set("X-RateLimit-Reset", headers.reset.toString());
  }
  return response;
}

export function addCorsHeaders(response: NextResponse): NextResponse {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
  return response;
}
