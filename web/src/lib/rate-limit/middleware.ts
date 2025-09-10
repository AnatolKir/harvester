import { NextRequest, NextResponse } from "next/server";
import {
  apiLimiter,
  authApiLimiter,
  checkRateLimitWithLimiter,
} from "./limiter";

export interface RateLimitHeaders {
  "X-RateLimit-Limit": string;
  "X-RateLimit-Remaining": string;
  "X-RateLimit-Reset": string;
  "Retry-After"?: string;
}

function getRateLimitHeaders(
  limit: number,
  remaining: number,
  reset: number
): RateLimitHeaders {
  const headers: RateLimitHeaders = {
    "X-RateLimit-Limit": limit.toString(),
    "X-RateLimit-Remaining": remaining.toString(),
    "X-RateLimit-Reset": new Date(reset).toISOString(),
  };

  if (remaining === 0) {
    const retryAfter = Math.ceil((reset - Date.now()) / 1000);
    headers["Retry-After"] = retryAfter.toString();
  }

  return headers;
}

export async function rateLimitMiddleware(
  request: NextRequest,
  options?: {
    authenticated?: boolean;
    identifier?: string;
  }
) {
  const identifier =
    options?.identifier ||
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    "anonymous";

  const limiter = options?.authenticated ? authApiLimiter : apiLimiter;

  const { success, limit, remaining, reset } = await checkRateLimitWithLimiter(
    limiter,
    identifier
  );

  const headers = getRateLimitHeaders(limit, remaining, reset);

  if (!success) {
    return NextResponse.json(
      {
        error: "Too Many Requests",
        message: "Rate limit exceeded. Please try again later.",
        retryAfter: headers["Retry-After"],
      },
      {
        status: 429,
        headers: headers as unknown as HeadersInit,
      }
    );
  }

  return { success, headers };
}

export function withRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse>,
  options?: {
    authenticated?: boolean;
  }
) {
  return async (request: NextRequest) => {
    const rateLimitResult = await rateLimitMiddleware(request, options);

    if ("error" in rateLimitResult) {
      return rateLimitResult;
    }

    const response = await handler(request);

    Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  };
}
